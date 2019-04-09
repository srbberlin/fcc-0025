window.onload = () => {
  const root = d3.select('svg')
  const toolTip = d3.select('#tooltip')
  const viewWidth = +root.attr('viewBox').split(' ')[2]
  const viewHeight = +root.attr('viewBox').split(' ')[3]
  const sectionHeight = 500
  const legendHeight = viewHeight - sectionHeight

  let width = d3.select('body').node().offsetWidth

  window.onresize = function() {
    width = d3.select('body').node().offsetWidth
  }

  function setTooltip (e, t) {
    const 
      d = d3.select(t).select('rect'),
      x = e.pageX - (230 * d3.event.pageX / width),
      y = e.pageY - 15 - toolTip.node().offsetHeight

    toolTip
      .attr('data-value', d.attr('data-value'))
      .attr('style', 'top: ' + (y) + 'px; left: ' + (x) + 'px; visibility: visible;')

    toolTip
      .text(d.attr('data-name'))
  }

  let toolTipHandler = {
    over: function () {
      setTooltip(d3.event, this)
    },
    move: function () {
      setTooltip(d3.event, this)
    },
    out: function () {
      toolTip
        .attr('style', 'visibility: hidden;')
    }
  }

  function wrap(data) {
    data
      .selectAll('text')
      .each((d, i, a) => {
        const 
          words = d.data.name.split(/\s+/),
          width = d.x1 - d.x0 - 15,
          lineHeight = 1.1,
          text =  d3.select(a[i])

        let
          word,
          line = [],
          lineNumber = 1,
          tspan = text
            .append('tspan')

        while ((word = words.shift()) != undefined) {
          line.push(word)
          tspan.text(line.join(' '))
          if (tspan.node().getComputedTextLength() > width) {
            if (line.length > 1) {
              line.pop()
              tspan.text(line.join(' '))
              line = [word]
            }
            else {
              line = []
            }
            tspan = text
              .append('tspan')
              .attr('x', 0)
              .attr('y', (lineNumber++ * lineHeight) + 'em')
              .text(line.join(' '))
          }
        }
      })
  }

  function createSection (start, data) {
    const a = start

      .append('g')
      .attr('width', viewWidth)
      .attr('height', sectionHeight)
      .attr('class', 'section')
      .attr('data-name', data.name)
      .attr('visibility', 'hidden')

    a .call(createTile, data, a)
      .call(wrap, d => d)
  }

  function createTile (g, data) {
    const hRoot = d3.hierarchy(data).sum(d => d.value)
    const treemapLayout = d3.treemap().size([viewWidth, sectionHeight]).paddingInner(1)
    const color = d3.scaleOrdinal(d3.schemeCategory20, hRoot.leaves().map(d => d.name))

    treemapLayout(hRoot)

    const res = g.node()

    const a = d3.select(res)
      .selectAll('g')
      .data(hRoot.leaves())
      .enter()
      .append('g')
      .attr('class', 'tileGroup')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .on('mouseover', toolTipHandler.over)
      .on('mousemove', toolTipHandler.move)
      .on('mouseout', toolTipHandler.out)

    a .append('rect')
      .attr('class', 'tile')
      .attr('data-name', d => d.data.name)
      .attr('data-category', d => d.data.category)
      .attr('data-value', d => d.value)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => color(d.data.category))

    a .append('text')
      .attr('transform', 'translate(4,12)')
      .attr('clip-path', d => `polygon(0 0, ${(d.x1 - d.x0) - 4} 0, ${(d.x1 - d.x0) - 4} ${(d.y1 - d.y0) - 4}, 0 ${(d.y1 - d.y0) - 4})`)
      .attr('class', 'h5')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('data-name', d => d.data.name)

    return res
  }

  function positions (cnt) {
    let cols = 3
    let i = 0
    let l = 0
    let res = []

    while (i < cnt) {
      let j = 0
      while (i < cnt && j < cols) {
        res.push([j++ * 200,l * 30])
        i++
      }
      l++
    }

    return res
  }

  function createLegends (start, data) {
    let color = {}, pos = {}
    const a = start
      .append('g')
      .attr('id', 'legend')
      .attr('transform', `translate(250,${sectionHeight + 50})`)
      .attr('width', viewWidth)
      .attr('height', legendHeight)
      .selectAll('g')
      .data(data)
      .enter()
      .append('g')
      .attr('id', d  => {
        color[d.name] = d3.scaleOrdinal(d3.schemeCategory20, d.children.map(d => d.name))
        pos[d.name] = d3.scaleOrdinal(positions(d.children.length), d.children.map(d => d.name))
        return d.name
      })
      .attr('class', 'legend')
      .attr('visibility', 'hidden')
      .attr('data-name', d => d.name)
      .selectAll('g')
      .data(d => d.children)
      .enter()
      .append('g')
      .attr('transform', (d,e,f) => {
        let i = f[0].parentNode.getAttribute('id')
        const [x, y] = pos[i](d.name)
        return 'translate(' + x + ',' + y + ')'}
      )
      .attr('y', (d,e,f) => {
        let i = f[0].parentNode.getAttribute('id')
        pos[i](d.name)[1]
      })

    a .append('rect')
      .attr('class', 'legend-item')
      .attr('fill', (d,e,f) => {
        let i = f[0].parentNode.parentNode.getAttribute('id')
        return color[i](d.name)
      })

    a .append('text')
      .attr('transform', 'translate(27,18)')
      .text(d => d.name)
  }

  function setMouseHandlers() {
    const a = d3.selectAll('.section, .legend')
    function f1 () {
      a.attr('visibility', 'hidden')
      a.nodes()[0].setAttribute('visibility', 'visible')
      a.nodes()[3].setAttribute('visibility', 'visible')
    }
    function f2 () {
      a.attr('visibility', 'hidden')
      a.nodes()[1].setAttribute('visibility', 'visible')
      a.nodes()[4].setAttribute('visibility', 'visible')
    }
    function f3 () {
      a.attr('visibility', 'hidden')
      a.nodes()[2].setAttribute('visibility', 'visible')
      a.nodes()[5].setAttribute('visibility', 'visible')
    }
    d3.select('#video')
      .on('click', f1)

    d3.select('#movie')
      .on('click', f2)

    d3.select('#kick')
      .on('click', f3)

    f1()
  }

  d3.queue()
    .defer(d3.json, 'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/kickstarter-funding-data.json')
    .defer(d3.json, 'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/movie-data.json')
    .defer(d3.json, 'https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/video-game-sales-data.json')
    .await((error, kickstarterPledges, movieSales, videoGameSales) => {
      if (error) throw error

      createSection(root, kickstarterPledges)
      createSection(root, movieSales)
      createSection(root, videoGameSales)
      createLegends(root, [kickstarterPledges, movieSales, videoGameSales])

      setMouseHandlers([kickstarterPledges, movieSales, videoGameSales])
    })
}