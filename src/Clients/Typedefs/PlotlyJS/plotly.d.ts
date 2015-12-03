declare module Plotly {
    function plot(element: HTMLDivElement, data: any, layout: any, options?: any): void;
    function redraw(element: HTMLDivElement): void;

    var Plots: {
        resize: (element: HTMLDivElement) => void;
    };
}