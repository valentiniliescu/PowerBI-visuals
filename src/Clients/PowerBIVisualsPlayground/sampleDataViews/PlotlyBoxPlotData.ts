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

/// <reference path="../_references.ts"/>

module powerbi.visuals.sampleDataViews {

    export class PlotlyBoxPlotData extends SampleDataViews implements ISampleDataViewsMethods {

        public name: string = "PlotlyBoxPlotData";
        public displayName: string = "Box plot data";

        public visuals: string[] = ['plotlyBoxPlot'];

        private sampleData: Array<[string, string, number]> = [
            ['day 1', 'kale', 0.01191455],
            ['day 1', 'kale', 0.716639715],
            ['day 1', 'kale', 0.753402331],
            ['day 1', 'kale', 0.082845919],
            ['day 1', 'kale', 0.052149099],
            ['day 2', 'kale', 0.022346875],
            ['day 2', 'kale', 0.68541959],
            ['day 2', 'kale', 0.959770413],
            ['day 2', 'kale', 0.673083854],
            ['day 2', 'kale', 0.675752842],
            ['day 1', 'carrots', 0.605870193],
            ['day 1', 'carrots', 0.077037793],
            ['day 1', 'carrots', 0.411322924],
            ['day 1', 'carrots', 0.740331972],
            ['day 1', 'carrots', 0.459847899],
            ['day 2', 'carrots', 0.326950664],
            ['day 2', 'carrots', 0.746466522],
            ['day 2', 'carrots', 0.71908863],
            ['day 2', 'carrots', 0.728874418],
            ['day 2', 'carrots', 0.664300818],
            ['day 1', 'radishes', 0.819379711],
            ['day 1', 'radishes', 0.60489394],
            ['day 1', 'radishes', 0.506406885],
            ['day 1', 'radishes', 0.580427622],
            ['day 1', 'radishes', 0.755045379],
            ['day 2', 'radishes', 0.557018306],
            ['day 2', 'radishes', 0.329047603],
            ['day 2', 'radishes', 0.424704035],
            ['day 2', 'radishes', 0.70705033],
            ['day 2', 'radishes', 0.026398284]
        ];

        public getDataViews(): DataView[] {
            let dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    {
                        displayName: 'Category',
                        type: powerbi.ValueType.fromDescriptor({ text: true }),
                        isMeasure: false
                    },
                    {
                        displayName: 'Series',
                        type: powerbi.ValueType.fromDescriptor({ text: true }),
                        isMeasure: false
                    },
                    {
                        displayName: 'Y',
                        type: powerbi.ValueType.fromDescriptor({ numeric: true }),
                        isMeasure: true
                    }
                ]
            };

            return [{
                metadata: dataViewMetadata,
                table: {
                    columns: dataViewMetadata.columns,
                    rows: this.sampleData
                }
            }];
        }

        public randomize(): void {
            this.sampleData.forEach(row => row[2] = Math.random());
        }

    }
}