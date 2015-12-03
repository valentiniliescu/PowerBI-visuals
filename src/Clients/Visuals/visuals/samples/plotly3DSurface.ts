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
    function plot(element: HTMLDivElement, data: any, layout: any): void;
    function redraw(element: HTMLDivElement): void;

    var Plots: {
        resize: (element: HTMLDivElement) => void;
    };
}

module powerbi.visuals.samples {

    interface Plotly3DSurfaceDataViewObjects extends DataViewObjects {
        general: Plotly3DSurfaceDataViewObject;
    }

    interface Plotly3DSurfaceDataViewObject extends DataViewObject {
        surfaceData: string;
        label: string;
    }

    export class Plotly3DSurface implements IVisual {
        public static capabilities: VisualCapabilities = {
            objects: {
                general: {
                    properties: {
                        surfaceData: { type: { /*TODO*/ } },
                        label: { type: { text: true } }
                    }
                }
            }
        };

        private element: JQuery;
        private firstUpdate: boolean = true;

        constructor() {
            this.loadPlotlyIfNeeded();
        }

        private loadPlotlyIfNeeded(): void {
            if (!Plotly)
                $.ajax({
                    url: 'https://cdn.plot.ly/plotly-1.1.0.min.js',
                    dataType: 'script',
                    cache: true
                });
        }

        public init(options: VisualInitOptions): void {
            this.element = options.element;
        }

        public update(options: VisualUpdateOptions) {
            const divElement = <HTMLDivElement>this.element[0];

            const dataViews = options.dataViews;
            if (!dataViews || dataViews.length === 0)
                return;

            const objects = <Plotly3DSurfaceDataViewObjects>dataViews[0].metadata.objects;
            if (!objects || !objects.general)
                return;

            //TODO: validate surfaceData
            const surfaceData = objects.general.surfaceData;
            const label = objects.general.label;

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
                    title: label,
                    autosize: true
                };

                Plotly.plot(divElement, data, layout);

                this.firstUpdate = false;
            } else if (surfaceData !== divElement['data'][0].z) {
                // data changed

                divElement['data'][0].z = surfaceData;
                divElement['layout'].title = label;

                Plotly.redraw(divElement);
            } else {
                // resize 

                // the div does not seem to resize when viewport changes
                this.element.height(options.viewport.height + 'px');
                this.element.width(options.viewport.width + 'px');

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