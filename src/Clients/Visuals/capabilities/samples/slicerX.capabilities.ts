
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
    export let slicerXCapabilities: VisualCapabilities = {
        dataRoles: [
            {
                name: 'Field',
                kind: VisualDataRoleKind.Grouping,
                displayName: powerbi.data.createDisplayNameGetter('Role_DisplayName_Field'),
            },

            {
                name: 'Values',
                kind: VisualDataRoleKind.Measure,
                displayName: 'Values',
            },
            {
                name: 'Image',
                kind: VisualDataRoleKind.GroupingOrMeasure,
                displayName: 'Image',
            },

        ],
        objects: {
            general: {
                displayName: data.createDisplayNameGetter('Visual_General'),
                properties: {
                    horizontal: {
                        displayName: 'Horizontal Orientation',
                        type: { bool: true }
                    },
                    columns: {
                        displayName: 'Columns',
                        type: { numeric: true }
                    },
                    /*  sortorder: {
                          displayName: 'Sort Order',
                          type: { text: true }
                      },*/
                    multiselect: {
                        displayName: 'Multiple selection',
                        type: { bool: true }
                    },
                    showdisabled: {
                        displayName: 'Show Disabled',
                        type: { text: true }
                    },
                    selected: {
                        type: { bool: true }
                    },
                    filter: {
                        type: { filter: {} },
                        rule: {
                            output: {
                                property: 'selected',
                                selector: ['Field'],
                            }
                        }
                    },
                    formatString: {
                        type: { formatting: { formatString: true } },
                    },

                },
            },
            header: {
                displayName: data.createDisplayNameGetter('Visual_Header'),
                properties: {
                    show: {
                        displayName: data.createDisplayNameGetter('Visual_Show'),
                        type: { bool: true }
                    },
                    title: {
                        displayName: 'Title',
                        type: { text: true }
                    },
                    fontColor: {
                        displayName: data.createDisplayNameGetter('Visual_FontColor'),
                        type: { fill: { solid: { color: true } } }
                    },
                    background: {
                        displayName: data.createDisplayNameGetter('Visual_Background'),
                        type: { fill: { solid: { color: true } } }
                    },
                    outline: {
                        displayName: data.createDisplayNameGetter('Visual_Outline'),
                        type: { formatting: { outline: true } }
                    },
                    textSize: {
                        displayName: data.createDisplayNameGetter('Visual_TextSize'),
                        type: { numeric: true }
                    },
                    outlineColor: {
                        displayName: data.createDisplayNameGetter('Visual_outlineColor'),
                        type: { fill: { solid: { color: true } } }
                    },
                    outlineWeight: {
                        displayName: data.createDisplayNameGetter('Visual_outlineWeight'),
                        type: { numeric: true }
                    }
                }
            },
            rows: {
                displayName: 'Rows',
                properties: {
                    fontColor: {
                        displayName: 'Text color',
                        type: { fill: { solid: { color: true } } }
                    },
                    textSize: {
                        displayName: data.createDisplayNameGetter('Visual_TextSize'),
                        type: { numeric: true }
                    },
                    height: {
                        displayName: 'Height',
                        type: { numeric: true }
                    },
                    width: {
                        displayName: 'Width',
                        type: { numeric: true }
                    },
                    selectedColor: {
                        displayName: 'Selected Color',
                        type: { fill: { solid: { color: true } } }
                    },
                    unselectedColor: {
                        displayName: 'Unselected Color',
                        type: { fill: { solid: { color: true } } }
                    },
                    disabledColor: {
                        displayName: 'Disabled Color',
                        type: { fill: { solid: { color: true } } }
                    },
                    background: {
                        displayName: data.createDisplayNameGetter('Visual_Background'),
                        type: { fill: { solid: { color: true } } }
                    },
                    outline: {
                        displayName: data.createDisplayNameGetter('Visual_Outline'),
                        type: { formatting: { outline: true } }
                    },
                    outlineColor: {
                        displayName: 'Outline color',
                        type: { fill: { solid: { color: true } } }
                    },
                    outlineWeight: {
                        displayName: data.createDisplayNameGetter('Visual_outlineWeight'),
                        type: { numeric: true }
                    },

                }
            },
            images: {
                displayName: 'Images',
                properties: {
                    imageSplit: {
                        displayName: 'Image Split',
                        type: { numeric: true }
                    },
                    stretchImage: {
                        displayName: 'Stretch image',
                        type: { bool: true }
                    },
                    bottomImage: {
                        displayName: 'Bottom image',
                        type: { bool: true }
                    },
                }
            },
        },
        dataViewMappings: [{
            conditions: [
                { 'Field': { max: 1 }, 'Image': { max: 0 } },
                { 'Field': { max: 1 }, 'Image': { min: 0, max: 1 }, 'Values': { min: 0, max: 1 } }],
            categorical: {
                categories: {
                    for: { in: 'Field' },
                    dataReductionAlgorithm: { top: {} }
                },
                values: {
                    group: {
                        by: 'Image',
                        select: [{ bind: { to: 'Values' } },
                            // {  bind: { to: 'Image' } }
                        ],
                        //  select: [{ for: { in: 'Values' } }],
                        dataReductionAlgorithm: { top: {} }
                    }
                },
                includeEmptyGroups: false
            }
        }],
        // filterMappings : {measureFilter:{targetRoles : []}},
        sorting: {
            default: {},
        },
        suppressDefaultTitle: true,
    };

    // TODO: Generate these from above, defining twice just introduces potential for error
    export let slicerXProps = {
        general: {
            horizontal: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'horizontal' },
            columns: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'columns' },
            //   sortorder: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'sortorder' },
            multiselect: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'multiselect' },
            showdisabled: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'showdisabled' },
        },
        header: {
            show: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'show' },
            title: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'title' },
            fontColor: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'fontColor' },
            background: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'background' },
            outline: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outline' },
            textSize: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'textSize' },
            outlineColor: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outlineColor' },
            outlineWeight: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outlineWeight' }
        },
        rows: {
            fontColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'fontColor' },
            textSize: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'textSize' },
            height: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'height' },
            width: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'width' },
            background: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'background' },
            selectedColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'selectedColor' },
            unselectedColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'unselectedColor' },
            disabledColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'disabledColor' },
            outline: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outline' },
            outlineColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outlineColor' },
            outlineWeight: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outlineWeight' },

        },
        images: {
            imageSplit: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'imageSplit' },
            stretchImage: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'stretchImage' },
            bottomImage: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'bottomImage' },
        },
        selectedPropertyIdentifier: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'selected' },
        filterPropertyIdentifier: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'filter' },
        formatString: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'formatString' },

    };

}
