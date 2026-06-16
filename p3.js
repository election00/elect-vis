// p3.js: interactive US election visualization
'use strict';
import {
  d3, parm, glob,
  // what else do you want to import from common.js?
} from './common.js';

/* create the annotated balance bars for popular and electoral college votes */
export const balanceInit = function (did, sid) {
  const div = document.getElementById(did);
  /* appending elements to the div likely changes clientWidth and clientHeight, hence the need to
  save these values representing the original grid */
  const ww = div.clientWidth;
  let hh = div.clientHeight;
  const svg = d3.select('#' + did).append('svg');
  // make svg fully occupy the (original) containing div
  svg.attr('id', sid).attr('width', ww).attr('height', hh);
  const wee = 2;
  const barTextPad = 8;
  const bal = svg.append('g').attr('transform', `translate(0,${2 * wee})`);
  hh -= 2 * wee;
  /* ascii-hard to help keep coordinates and ids straight
                     L                                                        R
  +                  ----------------------------|-----------------------------
        popular vote | #D-pv-bar,#D-pv-txt       |        #R-pv-bar,#R-pv-txt |
  H                  ----------------------------|-----------------------------
                       #D-name                   |                    #R-name
                     ----------------------------|-----------------------------
   electoral college | #D-ec-bar,#D-ec-txt       |        #R-ec-bar,#R-ec-txt |
                     ----------------------------|-----------------------------
  */
  // some convenience variables for defining geometry
  const L = ww / 7,
    R = (6.5 * ww) / 7,
    H = hh / 3;
  // mapping over an array of adhoc parameter objects to avoid copy-pasta
  [
    // create the left-side labels for the two bars
    { y: 0.5 * H, t: 'Popular Vote' },
    { y: 2.5 * H, t: 'Electoral College' },
  ].map((i) => {
    bal
      .append('text')
      .attr('transform', `translate(${L - barTextPad},${i.y})`)
      .style('text-anchor', 'end')
      .html(i.t);
  });
  const parts = [
    /* the bars and text values for the four counts: {D,R}x{popular vote, electoral college}, and,
    the two candidate names */
    { id: 'D-pv', p: -1, y: 0 },
    { id: 'D-name', p: -1, y: H },
    { id: 'D-ec', p: -1, y: 2 * H },
    { id: 'R-pv', p: 1, y: 0 },
    { id: 'R-name', p: 1, y: H },
    { id: 'R-ec', p: 1, y: 2 * H },
  ];
  parts.map((i) => {
    if (!i.id.includes('name')) {
      bal
        .append('rect')
        .attr(
          /* NOTE how these bars are transformed: your code only needs to set width (even though
          the D bars grow rightward, and the R bars grown leftward), and, your code doesn't need to
          know the width in pixels.  Just set width to 0.5 to make the bar go to the middle */
          'transform',
          i.p < 0 ? `translate(${L},0) scale(${R - L},1)` : `translate(${R},0) scale(${L - R},1)`
        )
        .attr('x', 0)
        .attr('y', i.y)
        .attr('height', H)
        .attr('fill', i.p < 0 ? parm.colorDem : parm.colorRep)
        // NOTE: select the bars with '#D-pv-bar', '#D-ec-bar', '#R-pv-bar', '#R-ec-bar'
        .attr('id', `${i.id}-bar`)
        .attr('width', 0.239); // totally random initial fractional value
    }
  });
  parts.map((i) => {
    const txt = bal
      .append('text')
      .attr('transform', `translate(${i.p < 0 ? L + barTextPad : R - barTextPad},${i.y + 0.5 * H})`)
      .style('text-anchor', i.p < 0 ? 'start' : 'end')
      // NOTE: select the text fields with '#D-pv-txt', '#D-ec-txt', '#R-pv-txt', '#R-ec-txt'
      .attr('id', `${i.id}${i.id.includes('name') ? '' : '-txt'}`);
    txt.html('#' + txt.node().id); // initialize text to show its own CSS selector
  });
  bal
    .append('line')
    .attr('x1', (L + R) / 2)
    .attr('x2', (L + R) / 2)
    .attr('y1', 0)
    .attr('y2', hh)
    .attr('stroke-width', 1)
    .attr('stroke', '#fff');
};

/* canvasInit initializes the HTML canvas that we use to draw a picture of the bivariate colormap
underneath the scatterplot. NOTE THAT AS A SIDE-EFFECT this sets glob.scatContext and
glob.scatImage, which you must use again later when changing the pixel values inside the canvas */
export const canvasInit = function (id) {
  const canvas = document.querySelector('#' + id);
  canvas.width = parm.scatSize;
  canvas.height = parm.scatSize;
  glob.scatContext = canvas.getContext('2d');
  glob.scatImage = glob.scatContext.createImageData(parm.scatSize, parm.scatSize);
  /* set pixels of glob.scatImage to checkerboard pattern with ramps; the only purpose of this is
  to show an example of traversing the scatImage pixel array, in a way that (with thought and
  scrutiny) identifies how i and j are varying over the image as it is seen on the screen. NOTE
  that nested for() loops like this are an idiomatic way of working with pixel data arrays, as
  opposed to functional idioms like .map() that we use for other kinds of data. */
  for (let k = 0, j = 0; j < parm.scatSize; j++) {
    for (let i = 0; i < parm.scatSize; i++) {
      glob.scatImage.data[k++] =
        100 + // RED channel is a constant plus ...
        (120 * i) / parm.scatSize + // ... ramp up along i,
        30 * (Math.floor(i / 40) % 2); // with wide bands
      glob.scatImage.data[k++] =
        100 + // GREEN channel is a constant plus ...
        (120 * j) / parm.scatSize + // ... ramp up along with j,
        30 * (Math.floor(j / 10) % 2); // with narrow bands
      glob.scatImage.data[k++] = 30; // BLUE channel is constant
      glob.scatImage.data[k++] = 255; // 255 = full OPACITY (don't change)
    }
  }
  /* display scatImage inside canvas.
  NOTE that you will need to call this again (exactly this way, with these variable names)
  anytime you change the scatImage.data canvas pixels */
  glob.scatContext.putImageData(glob.scatImage, 0, 0);
};

/* Place the scatterplot axis labels, and finalize the stacking of both the labels and the
scatterplot marks over the canvas. That this assumes many specific element ids in the DOM is likely
evidence of bad design */
export const scatLabelPos = function () {
  // place the scatterplot axis labels.
  const marg = 30; // around the scatterplot domain
  const wee = 7; // extra tweak to text position
  const sz = parm.scatSize;
  /* since these two had style "position: absolute", we have to specify where they will be, and
  this is done relative to the previously placed element, the canvas */
  /* (other functions here in p3.js try to avoid assuming particular element ids, using instead ids
  passed to the function, but that unfortunately became impractical for this function) */
  ['#scat-axes', '#scat-marks-container'].map((pid) =>
    d3
      .select(pid)
      .style('left', -marg)
      .style('top', -marg)
      .attr('width', 2 * marg + sz)
      .attr('height', 2 * marg + sz)
  );
  d3.select('#y-axis').attr('transform', `translate(${marg - wee},${marg + sz / 2}) rotate(-90)`);
  d3.select('#x-axis').attr('transform', `translate(${marg + sz / 2},${marg + sz + wee})`);
  d3.select('#scat-marks')
    .attr('transform', `translate(${marg},${marg})`)
    .attr('width', sz)
    .attr('height', sz);
};

/* scatMarksInit() creates the per-state circles to be drawn over the scatterplot */
export const scatMarksInit = function (id, data) {
  /* maps interval [0,data.length-1] to [0,parm.scatSize-1]; this is NOT an especially informative thing
  to do; it just gives all the tickmarks some well-defined initial location */
  const tscl = d3
    .scaleLinear()
    .domain([0, data.length - 1])
    .range([0, parm.scatSize]);
  /* create the circles */
  d3.select('#' + id)
    .selectAll('circle')
    .data(data)
    .join('circle')
    .attr('class', 'stateScat')
    // note that every scatterplot mark gets its own id, eg. 'stateScat_IL'
    .attr('id', d => `stateScat_${d.StateAbbr}`)
    .attr('r', parm.circRad)
    .attr('cx', (d, ii) => tscl(ii))
    .attr('cy', (d, ii) => parm.scatSize - tscl(ii));
};

export const formsInit = function (tlid, yid, years, mdid) {
  // finish setting up timeline for choosing the year
  const tl = d3.select('#' + tlid);
  const minYear = d3.min(years);
  const maxYear = d3.max(years);
  const updateTimelineKnob = (value) => {
    const progress = 100 * ((+value - minYear) / (maxYear - minYear));
    d3.select('#timeline-wrap').style('--progress', `${progress}%`);
  };
  tl.attr('min', minYear)
    .attr('max', maxYear)
    .attr('step', 4) // presidential elections are every 4 years
    // responding to both input and click facilitates being activated from code
    .on('input click', function () {
      /* This is one of the situations in which you CANNOT use an arrow function; you need a real
      "function" so that "this" is usefully set (here, "this" is this input element) */
      updateTimelineKnob(this.value);
      d3.select('#' + yid).html(this.value);
      yearSet(+this.value); // need the + so year is numeric
    });
  updateTimelineKnob(maxYear);

  // Make the whole slider rectangle draggable/clickable, including the edge cases.
  const tlNode = tl.node();
  const wrapNode = document.getElementById('timeline-wrap');
  const setTimelineFromClientX = (clientX) => {
    const rect = wrapNode.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const steps = Math.round(((maxYear - minYear) * ratio) / 4);
    const value = minYear + steps * 4;
    tl.property('value', value);
    tl.dispatch('input');
  };
  if (wrapNode) {
    let dragging = false;
    const move = (evt) => {
      if (!dragging) return;
      setTimelineFromClientX(evt.clientX);
    };
    const up = () => {
      dragging = false;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    wrapNode.addEventListener('mousedown', (evt) => {
      dragging = true;
      setTimelineFromClientX(evt.clientX);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
  }

  // create visual tick marks and every-other-year labels under the timeline
  const tickWrap = d3.select('#timeline-ticks');
  if (!tickWrap.empty()) {
    tickWrap
      .selectAll('span')
      .data(years)
      .join('span')
      .attr('class', (d, i) => `year-tick${i % 2 === 0 ? ' show-label' : ''}`)
      .style('--pos', (d, i) => `${(100 * i) / (years.length - 1)}%`)
      .attr('data-label', (d, i) => i % 2 === 0 ? String(d) : '');
  }

  // create radio buttons for choosing colormap/scatterplot mode
  const radioModes = Object.keys(glob.modeDesc).map(id => ({
    id,
    str: glob.modeDesc[id]
  }));
  // one span per choice
  const spans = d3
    .select('#' + mdid)
    .selectAll('span')
    .data(radioModes)
    .join('span');
  // inside each span, put a radio button
  spans
    .append('input')
    .attr('type', 'radio')
    .attr('name', 'mode') // any string that all the radiobuttons share
    .attr('id', (d) => d.id) // so label can refer to this, and is thus clickable
    .attr('value', (d) => d.id) // so that form as a whole has a value
    // respond to being selected by calling the modeSet function (in this file).
    .on('input', function (d) {
      modeSet(this.value);
    });
  // also in each span put the choice description
  spans
    .append('label')
    .attr('for', (d) => d.id)
    .html((d) => d.str);
};

/* TODO: finish dataProc, which takes the global state object, and modifies it as needed prior to
interactions starting. You will want to do things with the results of reading all the CSV data,
currently sitting in glob.csvData. */
export const dataProc = function (glob) {
  // some likely useful things are computed for you
  // glob.years: sorted array of all numerical years
  glob.years = glob.csvData.votes.columns // all column headers from voting data CSV
    .filter((c) => c.includes('_')) // select the years (works for given votes.csv)
    .map((c) => c.split('_')[1]) // extract year part (dropping 'DN', 'DE', 'RN', 'RE')
    // select only unique elements (note the use of all 3 args of filter function)
    .filter((d, i, A) => i == A.indexOf(d))
    .map((y) => +y) // and make into numbers
    .sort(); // make sure sorted if not already
  // glob.stateName: maps from two-letter abbreviation to full "state" name.
  glob.stateName = {};
  glob.csvData.stateNames.forEach(s => glob.stateName[s.StateAbbr] = s.StateName);
  // glob.cname: maps from election year to little object with D and R candidate names
  glob.cname = {};
  glob.csvData.candidateNames.forEach(nn => {
    glob.cname[+nn.year] = {
      D: nn.D,
      R: nn.R,
    };
  });
  // what other arrays or objects do you want to set up?
  glob.cmap = d3
    .scaleLinear()
    .domain([-1, 1])
    // the three colors selected on the page
    .range(['#2832FF', '#E61E14']);

  /* assumin population in US always increases, 
  the max number of votes for any years is hardcoded to the year 2020 */
  glob.max_votes_any_year = 17116679;
};

/* TODO: finish visInit, which sets up any other state or resources that your visualization code
will use to support fast user interaction */
export const visInit = function (glob) {

};

const updateAxes = function (mode) {
  if ('PUR' == mode) mode = 'RVD'; // RVD and PUR same; handle RVD
  const label = {
    RVD: ['Republican Votes', 'Democratic Votes'],
    LVA: ['Political Leaning', 'Amount of Votes'],
  }[mode];
  d3.select('#x-axis').html(label[0]);
  d3.select('#y-axis').html(label[1]);
};

/* TODO: here will go the functions that you write, including those called by modeSet and yearSet.
By the magic of hoisting, any functions you add here will also be visible to dataProc and visInit
above. */

// returns the max number of votes of a state from a certain year
function max_votes(year)
{
    var max_v = 0;
    var count = 0;

    //checks through all the states for this year
    while (count < 51)
    {
        // finds the total votes for that state for this year
        const total_votes_this_year = +glob.csvData.votes[count][`DN_${year}`] + +glob.csvData.votes[count][`RN_${year}`];
        // if total votes is greater than the saved max number of votes...
        if (total_votes_this_year > max_v)
        {
            // ...replace the current value with the new one
            max_v = total_votes_this_year;
        }
        count++;
    }
    return max_v;
}

function find_state_row(state_abbr)
{
    // count is used to find and hold the correct row of the state of interest
    var count = 0;
    while (count < 51)
    {
        if (glob.csvData.votes[count]['StateAbbr'] == state_abbr)
        {
            break;
        }
        count++;
    }
    return count;
}

// creates the bar at the top
function top_bar(year)
{
  // displays tthe candidate names for each year
  d3.select("#D-name").text(glob.cname[year].D);
  d3.select("#R-name").text(glob.cname[year].R);

  // creates an object that stores the 4 variables of interest
  var totals = {
      DN: 0,
      DE: 0,
      RN: 0,
      RE: 0,
  };

  // collects the sums for each column of interest to set the variables to
  glob.csvData.votes.forEach((row) => {
      totals.DN += +row[`DN_${year}`],
      totals.DE += +row[`DE_${year}`],
      totals.RN += +row[`RN_${year}`],
      totals.RE += +row[`RE_${year}`]
  });

  // displays the vote count and electoral college count for each year
  d3.select("#D-pv-txt").text(totals.DN.toLocaleString());
  d3.select("#R-pv-txt").text(totals.RN.toLocaleString());
  d3.select("#D-ec-txt").text(totals.DE.toLocaleString());
  d3.select("#R-ec-txt").text(totals.RE.toLocaleString());

  // scales each respective bar to the ratio of popular votes/electoral votes
  d3.select("rect#D-pv-bar").transition().attr("width", totals.DN/(totals.DN+totals.RN));
  d3.select("rect#R-pv-bar").transition().attr("width", totals.RN/(totals.DN+totals.RN));
  d3.select("rect#D-ec-bar").transition().attr("width", totals.DE/(totals.DE+totals.RE));
  d3.select("rect#R-ec-bar").transition().attr("width", totals.RE/(totals.DE+totals.RE));
}

// function that draws the tooltip features (outlines and text box)
function tooltip(year) 
{
    d3.selectAll('.tooltip').remove();

    glob.tip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('height', '100px')
        .style('min-width', '220px')
        .style('width', 'max-content')
        .style('padding', '0 12px')
        .style('box-sizing', 'border-box')
        .style('white-space', 'nowrap')
        .style('background-color', '#000000')
        .style('text-align', 'center')
        .style('position', 'absolute')
        .style('opacity', 0)
        .style('pointer-events', 'none');

    // get all the hexs and dots
    const elements = [d3.selectAll('g.state'), d3.selectAll('circle.stateScat')];

    // loops through to check if mouse is over any element
    elements.forEach(element => {
      element.on('mouseover', (event, d) => {

        // draws the outline for the hex
        d3.select(`#stateHexOutline_${d.StateAbbr}`)
            .style("stroke", "#f0ed25")
            .style("stroke-opacity", 1)
            .style("stroke-width", 5);

        // draws the outline for the scatterpoint point 
        d3.select(`#stateScat_${d.StateAbbr}`)
            .style("stroke", "#f0ed25")
            .style("stroke-opacity", 1)
            .style("stroke-width", 3);

        // row is used to find and hold the correct row of the state of interest
        const row = find_state_row(d.StateAbbr);

        // state data, formatted with commas
        const fmt = (n) => (+n).toLocaleString();

        const s_DN = fmt(glob.csvData.votes[row][`DN_${year}`]);
        const s_RN = fmt(glob.csvData.votes[row][`RN_${year}`]);
        const s_DE = fmt(glob.csvData.votes[row][`DE_${year}`]);
        const s_RE = fmt(glob.csvData.votes[row][`RE_${year}`]);

        // passes data in html string form to tooltip
        glob.tip.html(`${glob.stateName[d.StateAbbr]} in ${year} <br> 
                        <strong> &emsp;&emsp;&emsp;&emsp;&emsp; D &emsp;&emsp;&emsp; R</strong> <br>
                        Electoral: &numsp; ${s_DE} &emsp;&emsp;&emsp; ${s_RE} <br>
                        Popular: &numsp; ${s_DN} &numsp; ${s_RN} </br>`);

        // sets up the text box position
        // If the mouse is near the right edge of the browser, place tooltip to the left instead.
        const margin = 12;
        const tipNode = glob.tip.node();
        const tipWidth = tipNode.offsetWidth;
        const tipHeight = tipNode.offsetHeight;

        const viewportLeft = window.pageXOffset;
        const viewportTop = window.pageYOffset;
        const viewportRight = viewportLeft + window.innerWidth;
        const viewportBottom = viewportTop + window.innerHeight;

        let left = event.pageX + margin;
        let top = event.pageY + margin;

        if (left + tipWidth > viewportRight - margin) {
            left = event.pageX - tipWidth - margin;
        }

        if (top + tipHeight > viewportBottom - margin) {
            top = event.pageY - tipHeight - margin;
        }

        left = Math.max(viewportLeft + margin, left);
        top = Math.max(viewportTop + margin, top);

        glob.tip
          .style('opacity', 0.9)
          .style('top', `${top}px`)
          .style('left', `${left}px`);
      });

      // if mouse leaves shape
      element.on('mouseout', (event, d) => {

        // removes text box
        glob.tip.style('opacity', 0);

        // removes the outline for hex
        d3.select(`#stateHexOutline_${d.StateAbbr}`)
            .style("stroke-opacity", 0);

        // removes the outline for the point
        d3.select(`#stateScat_${d.StateAbbr}`)
            .style("stroke", d3.rgb(255, 255, 255))
            .style("stroke-opacity", 0.8)
            .style("stroke-width", 1.3);
      });
    });
};

function warpA(x, p) 
{
    return Math.pow(x, 1 / p);
}
    
function warpC(x, p) 
{
    return x > 0
        ? warpA(x, p)
        : -warpA(-x, p);
}

// displays the points on the scatterplot for RVD and PUR modes
function RVD_PUR_draw_points(count, year)
{
    const scale_DN = d3.scaleLinear()
                .domain([227, 0])
                .range([0, parm.scatSize]);

            const scale_RN = d3.scaleLinear()
                .domain([0, 227])
                .range([0, parm.scatSize]);

            d3.select(`#stateScat_${glob.csvData.votes[count]['StateAbbr']}`)
                .transition()
                .attr("cx", scale_RN(warpA(glob.csvData.votes[count][`RN_${year}`], 3)))
                .attr("cy", scale_DN(warpA(glob.csvData.votes[count][`DN_${year}`], 3)));
}

// displays the points on the scatterplot for the LVA mode
function LVA_draw_points(count, year)
{
  const maxVA = warpA(glob.max_votes_any_year, 1.5);

  const x_scale = d3.scaleLinear()
                .domain([-1, 1])
                .range([0, parm.scatSize]);
  
  const y_scale = d3.scaleLinear()
                .domain([0, maxVA])
                .range([parm.scatSize, 0]);

  count = 0;
  while (count < 51)
  {
      const DN = +glob.csvData.votes[count][`DN_${year}`];
      const RN = +glob.csvData.votes[count][`RN_${year}`];
      const TN = DN + RN;

      const PL = 2 * RN / (1 + TN) - 1;
      const VA = warpA(TN, 1.5);

      d3.select(`#stateScat_${glob.csvData.votes[count]['StateAbbr']}`)
        .transition()
        .attr('cx', x_scale(PL))
        .attr('cy', y_scale(VA));

      count++;
  }
}

function map_display(year, mode)
{
    var count = 0;
    // changes state colors to blue or red depending on the number of electoral college votes  
    if (mode == 'RVD')
    {
        while (count < 51)
        {
            // displays the points onto the scatterplot
            RVD_PUR_draw_points(count, year);

            // if DE > RE
            if (glob.csvData.votes[count][`DE_${year}`] > glob.csvData.votes[count][`RE_${year}`])
            {
                // changes state color to blue 
                d3.select(`#stateHex_${glob.csvData.votes[count]['StateAbbr']}`)
                    .transition()
                    .style("fill", parm.colorDem);
            }
            else
            {
                // changes state color to red 
                d3.select(`#stateHex_${glob.csvData.votes[count]['StateAbbr']}`)
                    .transition()
                    .style("fill", parm.colorRep);
            }
            count++;
        }
    }
    // changes state colors to a shade between red and blue depending on the total number of state votes 
    else if (mode == 'PUR')
    {
        while (count < 51)
        {
          // displays the points onto the scatterplot
          RVD_PUR_draw_points(count, year);

          // warped RN and DN values
          const warped_RN = warpC(+glob.csvData.votes[count][`RN_${glob.currentYear}`], 0.9);
          const warped_DN = warpC(+glob.csvData.votes[count][`DN_${glob.currentYear}`], 0.9);
          
          /* PL keeps tract of the each state's political leaning 
          Note: PL = 2*RN/(1 + (DN + RN)) - 1 (plus warping) */
          const PL = 2 * warped_RN / (1 + (warped_RN + warped_DN)) - 1;

          // creates the appropriate color based on PL
          const col = d3.rgb(d3.interpolateRgb(parm.colorDem, parm.colorRep)(PL + .5))

          // displays the state to its color 
          d3.select(`#stateHex_${glob.csvData.votes[count]['StateAbbr']}`)
                    .transition()
                    .style("fill", col);

            count++;
        }
    }
    // changes state colors to a shade of red or blue with luminance depending on population size. 
    else if (mode == 'LVA')
    {
        // displays the points onto the scatterplot
        LVA_draw_points(count, year);
        var count = 0;

        const maxVA = warpA(glob.max_votes_any_year, 1.5);

        while (count < 51)
        {
            const DN = +glob.csvData.votes[count][`DN_${year}`];
            const RN = +glob.csvData.votes[count][`RN_${year}`];
            const TN = DN + RN;

            // X value: political leaning
            const PL = 2 * RN / (1 + TN) - 1;

            // Y value: warped voting amount
            const VA = warpA(TN, 1.5);
            const VA_norm = Math.max(0, Math.min(1, VA / maxVA));

            // horizontal color path: blue -> bright gray -> red
            var base_col;
            if (PL < 0)
            {
                base_col = d3.rgb(d3.interpolateRgb(parm.colorDem, "#eeeeee")(PL + 1));
            }
            else
            {
                base_col = d3.rgb(d3.interpolateRgb("#eeeeee", parm.colorRep)(PL));
            }

            // lower VA = darker, higher VA = brighter
            var final_col = d3.hsl(base_col);
            final_col.l = final_col.l * (0.30 + 0.70 * VA_norm);
            final_col = d3.rgb(final_col);

            d3.select(`#stateHex_${glob.csvData.votes[count]['StateAbbr']}`)
                    .transition()
                    .style("fill", final_col); 

            count++;
        }
    }
}

// this function draws the plots depending on the specified mode
function plot_display(year, mode)
{
    if (mode == 'RVD')
    {
        // diagonal keeps track of the slope 
        var diagonal = parm.scatSize;
        for (let k = 0, j = 0; j < parm.scatSize; j++) {
            for (let i = 0; i < parm.scatSize; i++) {
                if (i > diagonal)
                {
                    // colors it red
                    glob.scatImage.data[k++] = 230;
                    glob.scatImage.data[k++] = 30;
                    glob.scatImage.data[k++] = 20; 
                    glob.scatImage.data[k++] = 255; 
                }
                else
                {
                    // colors it blue
                    glob.scatImage.data[k++] = 40;
                    glob.scatImage.data[k++] = 50;
                    glob.scatImage.data[k++] = 255; 
                    glob.scatImage.data[k++] = 255; 
                }
            }
            diagonal--;
        }
        glob.scatContext.putImageData(glob.scatImage, 0, 0);
    }
  else if (mode == "PUR")
  {
    for (let k = 0, j = 0; j < parm.scatSize; j++) {
        for (let i = 0; i <parm.scatSize; i++) {
          
          // warped RN and DN values
          const warped_RN = warpC(i, 0.25);
          const warped_DN = warpC(parm.scatSize - j, 0.25);

          /* PL keeps tract of the each state's political leaning 
          Note: PL = 2*RN/(1 + (DN + RN)) - 1 (plus warping) */
          const PL = 2 * warped_RN / (1 + (warped_RN + warped_DN)) - 1;

          // creates the appropriate color based on PL
          const col = d3.rgb(d3.interpolateRgb(parm.colorDem, parm.colorRep)(PL + .5))

          // colors pixels accordingly
          glob.scatImage.data[k++] = col.r;
          glob.scatImage.data[k++] = col.g;
          glob.scatImage.data[k++] = col.b;
          glob.scatImage.data[k++] = 255; 
        } 
      }
      glob.scatContext.putImageData(glob.scatImage, 0, 0);
  }
  else if (mode == 'LVA')
  {
    for (let k = 0, j = 0; j < parm.scatSize; j++) {
      for (let i = 0; i < parm.scatSize; i++) {

        // X controls political leaning: left blue, middle gray, right red
        const PL = -1 + 2 * (i / (parm.scatSize - 1));

        // Y controls voting amount: bottom dark, top bright
        const VA_norm = 1 - (j / (parm.scatSize - 1));

        // horizontal color path: blue -> bright gray -> red
        var base_col;
        if (PL < 0)
        {
            base_col = d3.rgb(d3.interpolateRgb(parm.colorDem, "#eeeeee")(PL + 1));
        }
        else
        {
            base_col = d3.rgb(d3.interpolateRgb("#eeeeee", parm.colorRep)(PL));
        }

        // lower VA = darker, higher VA = brighter
        var final_col = d3.hsl(base_col);
        final_col.l = final_col.l * (0.30 + 0.70 * VA_norm);
        final_col = d3.rgb(final_col);

        // sets the pixel color 
        glob.scatImage.data[k++] = final_col.r;
        glob.scatImage.data[k++] = final_col.g;
        glob.scatImage.data[k++] = final_col.b;
        glob.scatImage.data[k++] = 255; 
      } 
    }
    glob.scatContext.putImageData(glob.scatImage, 0, 0);
  }
}

// UI wants to set the new colormapping mode to "mode"
const modeSet = function (mode) {
  console.log(`modeSet(${mode}): hello`);
  if (glob.currentMode == mode) return; // nothing to do
  // else do work to display mode "mode"
  updateAxes(mode);
  /* Your code should:
  update the colormap image underneath the scatterplot,
  the position of the marks in the scatterplot, and
  how the states in the US map are filled */
  
  // calls map display function with mode specification

  // align mode with currentMode
  glob.currentMode = mode;

  // calls map display function with mode specification
  map_display(glob.currentYear, mode);
  
  // calls plot display function with mode specification
  plot_display(glob.currentYear, mode);

  glob.currentMode = mode;
};

// UI wants to set the near year to "year"
const yearSet = function (year) {
  console.log(`yearSet(${year}): hello`);
  if (glob.currentYear == year) return; // nothing to do
  /* else do work to display year "year". Your code should:
  update the position of the marks in the scatterplot,
  how the states in the US map are filled,
  and the balance bars */
  
  // align year with glob.currentYear
  glob.currentYear = year;
  // creates the bar at the top
  top_bar(year);

   // calls map display function with mode specification
  map_display(year, glob.currentMode);

  // redraws the scatterplot background so the canvas does not stay stale
  plot_display(year, glob.currentMode);
  
  // initiates the tooltip feature
  tooltip(year);
  
  glob.currentYear = year;
};
