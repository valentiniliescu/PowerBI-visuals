declare module Plotly {
    function plot(element: HTMLDivElement, data: any, layout: any): void;
    function redraw(element: HTMLDivElement): void;

    var Plots: {
        resize: (element: HTMLDivElement) => void;
    };
}