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

    export class SimpleSlicerXData extends SampleDataViews implements ISampleDataViewsMethods {

        public name: string = "SimpleSlicerXData";
        public displayName: string = "Car logos";

        public visuals: string[] = ['slicerX'];

        private sampleData = [
            [5, 10, 15, 20, 25],
            [
                "http://www.carfolio.com/images/dbimages/zgas/manufacturers/id/843/bmw-logo.png",
                "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Mercedes_benz_logo1989.png/120px-Mercedes_benz_logo1989.png",
                "http://www.rayten.com/wp-content/uploads/2012/02/Honda-logo-1.png",
                "http://auto-koller.com/images/logos/Toyota_Transparent.gif",
                "http://a.dlron.us/assets/logos/transparent/Ferrari.png"
            ]
        ];

        public getDataViews(): DataView[] {

            let fieldExpr = powerbi.data.SQExprBuilder.fieldExpr({ column: { schema: 's', entity: "table1", name: "country" } });

            let categoryValues = ["BMW", "Mercedes", "Honda", "Toyota", "Ferrari"];
            let categoryIdentities = categoryValues.map(function (value) {
                let expr = powerbi.data.SQExprBuilder.equal(fieldExpr, powerbi.data.SQExprBuilder.text(value));
                return powerbi.data.createDataViewScopeIdentity(expr);
            });
        
            // Metadata, describes the data columns, and provides the visual with hints
            // so it can decide how to best represent the data
            let dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    {
                        displayName: 'Car',
                        queryName: 'Country',
                        type: powerbi.ValueType.fromDescriptor({ text: true })
                    },
                    {
                        displayName: 'Values',
                        format: "g",
                        isMeasure: true,
                        queryName: 'Image',
                        roles: { Values : true },
                        type: powerbi.ValueType.fromDescriptor({ numeric: true }),
                        objects: { dataPoint: { fill: { solid: { color: 'purple' } } } },
                    },
                    {
                        displayName: 'Image',
                        format: "g",
                        isMeasure: true,
                        queryName: 'Image',
                        type: powerbi.ValueType.fromDescriptor({ text: true })
                    }
                ],
                objects: {
                    general: {
                        columns: 1
                    }
                }
            };

            let columns = [
                {
                    source: dataViewMetadata.columns[1],
                    values: this.sampleData[0]
                },
                {
                    source: dataViewMetadata.columns[2],
                    values: this.sampleData[1]
                }
            ];

            let dataValues: DataViewValueColumns = DataViewTransform.createValueColumns(columns);

            return [{
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: categoryValues,
                        identity: categoryIdentities,
                    }],
                    values: dataValues
                }
            }];
        }

        public randomize(): void {
        }        
    }
}