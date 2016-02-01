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

module powerbi.visuals.samples {

    interface PlotlyHeightmapViewModel {
        x: number[];
        y: number[];
        z: number[][];
    }

    interface Map<T> {
        [key: number]: T;
    }

    export class PlotlyHeightmap implements IVisual {
        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'X',
                    kind: VisualDataRoleKind.GroupingOrMeasure,
                    displayName: 'X',
                    requiredTypes: [{ numeric: true }, { integer: true }]
                }, {
                    name: 'Y',
                    kind: VisualDataRoleKind.GroupingOrMeasure,
                    displayName: 'Y',
                    requiredTypes: [{ numeric: true }, { integer: true }]
                }, {
                    name: 'Z',
                    kind: VisualDataRoleKind.GroupingOrMeasure,
                    displayName: 'Z',
                    requiredTypes: [{ numeric: true }, { integer: true }]
                }
            ],
            dataViewMappings: [{
                conditions: [
                    { 'X': { max: 1 }, 'Y': { max: 1 }, 'Z': { max: 1 } }
                ],
                table: {
                    rows: {
                        select: [
                            { bind: { to: 'X' } },
                            { bind: { to: 'Y' } },
                            { bind: { to: 'Z' } },
                        ]
                    },
                    rowCount: { preferred: { min: 1 } }
                }
            }]
        };

        private element: JQuery;
        private firstUpdate: boolean = true;

        protected modelExtraProperties(): any {
        }

        public init(options: VisualInitOptions): void {
            this.element = options.element;
            this.element.empty();
            $('<div />').appendTo(this.element).width('100%').height('100%');
        }

        public update(options: VisualUpdateOptions) {
            const divElement = <HTMLDivElement>this.element.children()[0];

            const dataViews = options.dataViews;
            if (!dataViews || dataViews.length === 0)
                return;

            if (!dataViews[0].table)
                return;

            const viewModel = PlotlyHeightmap.converter(dataViews[0].table);

            if (!viewModel)
                return;

            // the div does not seem to resize when viewport changes
            this.element.height(options.viewport.height + 'px');
            this.element.width(options.viewport.width + 'px');

            // TODO: handle changes in all VisualUpdateOptions properties
            if (this.firstUpdate) {
                // first update
                const data = [_.merge(viewModel, this.modelExtraProperties())];
                const layout = {
                    margin: {
                        l: 20,
                        r: 20,
                        t: 20,
                        b: 20
                    },
                    autosize: true
                };

                Plotly.plot(divElement, data, layout, { displayModeBar: false });
                Plotly.Plots.resize(divElement);

                this.firstUpdate = false;
            } else if (!_.isEqual(viewModel.z, divElement['data'][0].z)) {
                // data changed

                divElement['data'][0].x = viewModel.x;
                divElement['data'][0].y = viewModel.y;
                divElement['data'][0].z = viewModel.z;

                Plotly.redraw(divElement);
            } else {
                // resize 

                Plotly.Plots.resize(divElement);
            }
        }

        public destroy() {
            this.element.empty();
        }

        private static converter(table: DataViewTable): PlotlyHeightmapViewModel {
            if (!table || !table.rows || table.rows.length === 0 || !table.columns) {
                return null;
            }

            const xColumns = table.columns.filter(column => column.roles && column.roles['X']);
            const yColumns = table.columns.filter(column => column.roles && column.roles['Y']);
            const zColumns = table.columns.filter(column => column.roles && column.roles['Z']);

            if (xColumns.length !== 1 || yColumns.length !== 1 || zColumns.length !== 1) {
                return null;
            }

            const map: Map<Map<number>> = {};

            const xIndex = xColumns[0].index;
            const yIndex = yColumns[0].index;
            const zIndex = zColumns[0].index;

            table.rows.forEach(row => {
                const x = row[xIndex];
                const y = row[yIndex];
                const z = row[zIndex];

                if (!map[x]) {
                    map[x] = {};
                }

                map[x][y] = z;
            });

            const xs: number[] = Object.keys(map).map(k => parseInt(k, 10)).sort((a, b) => a - b);
            const ys: number[] = Object.keys(map[xs[0]]).map(k => parseInt(k, 10)).sort((a, b) => a - b);
            const zs: number[][] = new Array<number[]>(xs.length);

            for (let xi = 0; xi < xs.length; xi++) {
                const x: number = xs[xi];

                if (Object.keys(map[x]).length !== ys.length) {
                    return null;
                }

                zs[xi] = new Array<number>(ys.length);

                for (let yi = 0; yi < ys.length; yi++) {
                    const y: number = ys[yi];
                    const z: number = map[x][y];

                    if (z === undefined) {
                        return null;
                    }

                    zs[xi][yi] = z;
                }
            }

            return { x: xs, y: ys, z: zs };
        }
    }
}