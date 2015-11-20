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
    import DataViewTransform = powerbi.data.DataViewTransform;

    export class SimpleAreaRangeData extends SampleDataViews implements ISampleDataViewsMethods {

        public name: string = "SimpleAreaRangeData";
        public displayName: string = "Area Range Sales By Country";

        public visuals: string[] = ['areaRangeChart'];

        private sampleData = [
            [
                [0, 2, 4, 2, 2, 0],
                [1, 3, 6, 3, 4, 1]
            ]
        ];

        private sampleMin: number = 0;
        private sampleMax: number = 9;

        //private categoryValues;

        public getDataViews(): DataView[] {

            let fieldExpr = powerbi.data.SQExprBuilder.fieldExpr({ column: { schema: 's', entity: "table1", name: "country" } });
            /*
            var tidelineScale = d3.time.scale.utc()
                    .domain([new Date('2012-03-08T12:00:00.000Z'), new Date('2014-03-10T00:00:00.000Z')])
                     .range([0, 100]);
            
            var categoryValues = tidelineScale.ticks(100);//(d3.time.months, 15);
            
            var categoryIdentities = categoryValues.map(function (value) {
                var expr = powerbi.data.SQExprBuilder.equal(fieldExpr, powerbi.data.SQExprBuilder.dateTime(value));
                return powerbi.data.createDataViewScopeIdentity(expr);
            });

            */     
            
            var categoryValues = ["Australia", "Canada", "France", "Germany", "United Kingdom", "United States"];
            let categoryIdentities = categoryValues.map(function(value) {
                let expr = powerbi.data.SQExprBuilder.equal(fieldExpr, powerbi.data.SQExprBuilder.text(value));
                return powerbi.data.createDataViewScopeIdentity(expr);
            });
            
            // Metadata, describes the data columns, and provides the visual with hints
            // so it can decide how to best represent the data
            let dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                   /* {
                        displayName: 'Date',
                        queryName: 'Date',
                        format: "d",
                        type: powerbi.ValueType.fromDescriptor({ dateTime: true }),
                        roles: {
                            Category: true
                        }
                    },*/
                    {
                        displayName: 'Country',
                        queryName: 'Country',
                        type: powerbi.ValueType.fromDescriptor({ text: true }),
                        roles: {
                            Category: true
                        }
                    },
                
                    {
                        displayName: 'District',
                        queryName: 'District',
                        type: powerbi.ValueType.fromDescriptor({ text: true }),
                        roles: {
                            Series: true
                        }
                    },
                    {
                        displayName: 'Sales Amount (2014)',
                        isMeasure: true,
                        format: "$0,000.00",
                        queryName: 'district',
                        roles: {
                            Lower: true
                        },
                        type: powerbi.ValueType.fromDescriptor({ numeric: true }),
                        objects: { dataPoint: { fill: { solid: { color: 'purple' } } } },
                    },
                    {
                        displayName: 'Sales Amount (2015)',
                        isMeasure: true,
                        format: "$0,000.00",
                        queryName: 'district',
                        roles: {
                            Upper: true
                        },
                        type: powerbi.ValueType.fromDescriptor({ numeric: true })
                    }
                ]
            };

            let columns: DataViewValueColumn[] = [
                {
                    source: dataViewMetadata.columns[2],
                    // Sales Amount for 2014
                    values: this.sampleData[0][0],
                },
                {
                    source: dataViewMetadata.columns[3],
                    // Sales Amount for 2015
                    values: this.sampleData[0][1],
                }
            ];

            let dataValues: DataViewValueColumns = DataViewTransform.createValueColumns(columns);

            return [{
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: categoryValues,
                        identity: categoryIdentities
                    }],
                    values: dataValues,
                }
            }];
        }
        
        public randomize(): void {

            this.sampleData = this.sampleData.map((item) => {
                var values1 = [];
                var values2 = [];
                for (var i = 0; i < 6; i++) {
                    values1.push(this.getRandomValue(this.sampleMin, this.sampleMax));
                    values2.push(this.getRandomValue(this.sampleMin, this.sampleMax));
                }
                return [values1, values2];
            });
        }
    }
}
