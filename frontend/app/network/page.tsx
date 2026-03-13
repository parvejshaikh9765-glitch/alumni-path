"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { getNetworkGraph, getAlumni } from "@/lib/api";

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: "university" | "alumni" | "company" | "industry";
}

interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

const NODE_COLORS: Record<GraphNode["type"], string> = {
  university: "#8b5cf6",
  alumni: "#3b82f6",
  company: "#10b981",
  industry: "#f97316",
};

export default function NetworkPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [nodeCount, setNodeCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        let nodes: GraphNode[] = [];
        let edges: GraphEdge[] = [];

        try {
          const graph = await getNetworkGraph();
          nodes = graph.nodes as GraphNode[];
          edges = graph.edges as GraphEdge[];
        } catch {
          // Build graph from alumni data
          const alumni = await getAlumni({ limit: 50 });
          const uniNode: GraphNode = { id: "uni_main", label: "University", type: "university" };
          nodes.push(uniNode);

          const companySet = new Map<string, GraphNode>();
          const industrySet = new Map<string, GraphNode>();

          alumni.forEach((a) => {
            const alumniNode: GraphNode = { id: `alumni_${a.id}`, label: a.name, type: "alumni" };
            nodes.push(alumniNode);
            edges.push({ source: "uni_main", target: alumniNode.id });

            if (a.current_company) {
              const cKey = `company_${a.current_company}`;
              if (!companySet.has(cKey)) {
                const cn: GraphNode = { id: cKey, label: a.current_company, type: "company" };
                companySet.set(cKey, cn);
                nodes.push(cn);
              }
              edges.push({ source: alumniNode.id, target: cKey });

              if (a.industry) {
                const iKey = `industry_${a.industry}`;
                if (!industrySet.has(iKey)) {
                  const ind: GraphNode = { id: iKey, label: a.industry, type: "industry" };
                  industrySet.set(iKey, ind);
                  nodes.push(ind);
                }
                edges.push({ source: cKey, target: iKey });
              }
            }
          });
        }

        setNodeCount(nodes.length);
        renderGraph(nodes, edges);
      } catch {
        setNodeCount(-1);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const renderGraph = (nodes: GraphNode[], edges: GraphEdge[]) => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = svgEl.clientWidth ?? 800;
    const height = svgEl.clientHeight ?? 600;

    const g = svg.append("g");

    (svg as d3.Selection<SVGSVGElement, unknown, null, undefined>).call(
      d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
        g.attr("transform", event.transform);
      })
    );

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphEdge>(edges).id((d) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(30));

    const link = g
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", 1.5);

    const node = g
      .append("g")
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => (d.type === "university" ? 16 : d.type === "alumni" ? 10 : 12))
      .attr("fill", (d) => NODE_COLORS[d.type])
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGCircleElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.75)")
      .style("color", "#fff")
      .style("padding", "4px 8px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("display", "none");

    node
      .on("mouseover", (event, d) => {
        tooltip
          .style("display", "block")
          .html(`<strong>${d.label}</strong><br/><span style="opacity:0.7">${d.type}</span>`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", event.pageX + 12 + "px").style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    const label = g
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => (d.label.length > 16 ? d.label.slice(0, 14) + "…" : d.label))
      .attr("font-size", 9)
      .attr("fill", "#374151")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.type === "university" ? 30 : 24))
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);
      node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      label.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
    });

    return () => {
      tooltip.remove();
    };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Network Graph</h1>
      <p className="text-sm text-gray-500 mb-4">
        Force-directed graph showing alumni connections to companies and industries. Drag to rearrange, scroll to zoom.
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        {(Object.entries(NODE_COLORS) as [GraphNode["type"], string][]).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
            <span className="capitalize text-gray-600">{type}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm relative" style={{ height: 560 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl z-10">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading network…</span>
            </div>
          </div>
        )}
        {!loading && nodeCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            No network data available. Upload alumni records first.
          </div>
        )}
        <svg ref={svgRef} width="100%" height="100%" className="rounded-xl" />
      </div>
    </div>
  );
}
