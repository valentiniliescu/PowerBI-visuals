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
    export class SimpleDateData extends SampleDataViews implements ISampleDataViewsMethods {
        private minYear: number = 1800;
        private maxYear: number = 2016;

        private minMonth: number = 1;
        private maxMonth: number = 12;

        private minDate: number = 1;
        private maxDate: number = 31;

        public name: string = "SimpleDateData";
        public displayName: string = "Simple Date Data";

        public visuals: string[] = ["timeline"];

        private sampleData: Date[] = [
            new Date(2000, 1, 1),
            new Date(2004, 1, 25),
            new Date(2000, 10, 10),
            new Date(2001, 3, 12),
            new Date(2008, 6, 10),
            new Date(2008, 7, 10),
            new Date(2000, 1, 1),
            new Date(2017, 1, 1),
            new Date(2016, 1, 1),
            new Date(2015, 1, 1)
        ];

        public getDataViews(): DataView[] {
            let dataViewMetadata: powerbi.DataViewMetadata ={
                columns: [{
                    displayName: "Date",
                    queryName: "Date",
                    type: powerbi.ValueType.fromDescriptor({ dateTime: true })
                }]
            },
            fieldExpr = powerbi.data.SQExprBuilder.fieldExpr({
                column: {
                    schema: "d",
                    entity: "table1",
                    name: "country"
                }
            }),
            categoryIdentities = this.sampleData.map((item: Date) => {
                var expr = powerbi.data.SQExprBuilder.equal(
                    fieldExpr,
                    powerbi.data.SQExprBuilder.dateTime(item));

                return powerbi.data.createDataViewScopeIdentity(expr);
            });

            return [{
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: this.sampleData,
                        identity: categoryIdentities
                    }]
                }
            }];
        }

        public randomize(): void {
            this.sampleData = this.sampleData.map(() => {
                return new Date(
                    Math.round(this.getRandomValue(this.minYear, this.maxYear)),
                    Math.round(this.getRandomValue(this.minMonth, this.maxMonth)),
                    Math.round(this.getRandomValue(this.minDate, this.maxDate)));
            });
        }
    }
}