/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/// <reference path="../../_references.ts"/>

declare module Plotly {
    function plot(element: HTMLDivElement, data: any, layout: any, options?: any): void;
    function redraw(element: HTMLDivElement): void;

    var Plots: {
        resize: (element: HTMLDivElement) => void;
    };
}

//TODO: find a better way for dealing with third-party libraries
if (!('Plotly' in window))
    $.ajax({
        url: 'https://cdn.plot.ly/plotly-1.2.0.min.js',
        dataType: 'script',
        cache: true
    });

module powerbi.visuals.samples {

    export class Plotly3DSurface implements IVisual {
        public static capabilities: VisualCapabilities = {
            dataRoles: [{
                name: 'Values',
                kind: VisualDataRoleKind.GroupingOrMeasure
            }],
            dataViewMappings: [{
                table: {
                    rows: {
                        for: { in: 'Values' },
                        dataReductionAlgorithm: { top: {} }
                    },
                    rowCount: { preferred: { min: 1 } }
                },
            }]
        };

        private element: JQuery;
        private firstUpdate: boolean = true;

        public init(options: VisualInitOptions): void {
            this.element = options.element;
        }

        public update(options: VisualUpdateOptions) {
            if (!('Plotly' in window))
                return;

            const divElement = <HTMLDivElement>this.element[0];

            const dataViews = options.dataViews;
            if (!dataViews || dataViews.length === 0)
                return;

            if (!dataViews[0].table)
                return;

            const surfaceData = dataViews[0].table.rows;

            // the div does not seem to resize when viewport changes
            this.element.height(options.viewport.height + 'px');
            this.element.width(options.viewport.width + 'px');

            // TODO: handle changes in all VisualUpdateOptions properties
            if (this.firstUpdate) {
                // first update
                const data = [
                    {
                        z: surfaceData,
                        type: 'surface'
                    }
                ];
                const layout = {
                    autosize: true
                };

                Plotly.plot(divElement, data, layout, { displayModeBar: false });
                Plotly.Plots.resize(divElement);

                this.firstUpdate = false;
            } else if (surfaceData !== divElement['data'][0].z) {
                // data changed

                divElement['data'][0].z = surfaceData;

                Plotly.redraw(divElement);
            } else {
                // resize 

                Plotly.Plots.resize(divElement);
            }
        }

        public destroy() {
        }
    }
}

module powerbi.visuals.plugins {
    export var plotly3DSurface: IVisualPlugin = {
        name: 'plotly3DSurface',
        capabilities: samples.Plotly3DSurface.capabilities,
        create: () => new samples.Plotly3DSurface()
    };
}