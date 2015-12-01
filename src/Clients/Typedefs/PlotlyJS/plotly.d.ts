declare module Plotly {
    function plot(element: HTMLDivElement, data: any, layout: any): void;

    var Plots: {
        resize: (element: HTMLDivElement) => void;
    };
}