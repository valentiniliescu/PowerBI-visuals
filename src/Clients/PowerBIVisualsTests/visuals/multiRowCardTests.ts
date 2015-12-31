﻿/*
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

module powerbitests {
    import MultiRowCard = powerbi.visuals.MultiRowCard;
    import multiRowCardCapabilities = powerbi.visuals.multiRowCardCapabilities;
    import ValueType = powerbi.ValueType;
    import PrimitiveType = powerbi.PrimitiveType;

    describe("MultiRowCard", () => {
        it("MultiRowCard_registered_capabilities", () => {
            expect(powerbi.visuals.visualPluginFactory.create().getPlugin("multiRowCard").capabilities).toBe(multiRowCardCapabilities);
        });

        it("Capabilities should include dataViewMappings", () => {
            expect(multiRowCardCapabilities.dataViewMappings).toBeDefined();
        });

        it("Capabilities should include dataRoles", () => {
            expect(multiRowCardCapabilities.dataRoles).toBeDefined();
        });

        it("Capabilities should suppressDefaultTitle", () => {
            expect(multiRowCardCapabilities.suppressDefaultTitle).toBe(true);
        });

        it("FormatString property should match calculated", () => {
            expect(powerbi.data.DataViewObjectDescriptors.findFormatString(multiRowCardCapabilities.objects)).toEqual(MultiRowCard.formatStringProp);
        });
    });

    describe("MultiRowCard DOM tests", () => {
        let v: MultiRowCard, element: JQuery;
        let hostServices = powerbitests.mocks.createVisualHostServices();
        let dataTypeWebUrl = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text, "WebUrl");

        let dataViewMetadata: powerbi.DataViewMetadata = {
            columns: [
                { displayName: "value", type: ValueType.fromDescriptor({ numeric: true }) },
                { displayName: "date", type: ValueType.fromDescriptor({ dateTime: true }) },
                { displayName: "category", type: ValueType.fromDescriptor({ text: true }) }
            ]
        };

        let dataViewMetadataWithURL: powerbi.DataViewMetadata = {
            columns: [
                { displayName: "category", type: ValueType.fromDescriptor({ text: true }) },
                { displayName: "URL", type: dataTypeWebUrl }
            ]
        };

        let dataViewMetadataWithURLTitle: powerbi.DataViewMetadata = {
            columns: [
                { displayName: "value", type: ValueType.fromDescriptor({ numeric: true }) },
                { displayName: "URL", type: dataTypeWebUrl }
            ]
        };

        let dataViewMetadataWithKPI: powerbi.DataViewMetadata = {
            columns: [
                {
                    displayName: "KPI",
                    kpi: {
                        graphic: 'Five Bars Colored'
                    },
                    type: ValueType.fromDescriptor({ numeric: true })
                },
                { displayName: "value", type: ValueType.fromDescriptor({ text: true }) }
            ]
        };

        let data: powerbi.DataView = {
            metadata: dataViewMetadata,
            table: {
                rows: [
                    [123456.789, new Date(1999, 7, 31, 6, 15), "category1"],
                    [12345, new Date(2014, 7, 1), "category2"]
                ],
                columns: dataViewMetadata.columns
            }
        };

        let dataViewMetadataWithTitle: powerbi.DataViewMetadata = {
            columns: [
                { displayName: "value", type: ValueType.fromDescriptor({ numeric: true }), isMeasure: true },
                { displayName: "genre", type: ValueType.fromDescriptor({ text: true }) }
            ]
        };

        let dataWithTitle: powerbi.DataView = {
            metadata: dataViewMetadataWithTitle,
            table: {
                rows: [
                    [123456.789, "Action"],
                    [12345, "Adventure"]
                ],
                columns: dataViewMetadataWithTitle.columns
            }
        };

        let dataWithNullValue: powerbi.DataView = {
            metadata: dataViewMetadataWithTitle,
            table: {
                rows: [
                    [null, "Action"],
                    [null, "Adventure"]
                ],
                columns: dataViewMetadataWithTitle.columns
            }
        };

        let dataWithURLTitle: powerbi.DataView = {
            metadata: dataViewMetadataWithURLTitle,
            table: {
                rows: [
                    [123456.789, "http://bing.com"],
                    [12345, "http://microsoft.com"]
                ],
                columns: dataViewMetadataWithURLTitle.columns
            }
        };

        let dataWithKPI: powerbi.DataView = {
            metadata: dataViewMetadataWithKPI,
            table: {
                rows: [
                    [1, "test1"],
                    [2, "test2"]
                ],
                columns: dataViewMetadataWithKPI.columns
            }
        };

        let dataWithURLValues: powerbi.DataView = {
            metadata: dataViewMetadataWithURL,
            table: {
                rows: [
                    ["category1", "http://bing.com"],
                    ["category2", "http://microsoft.com"]
                ],
                columns: dataViewMetadataWithURL.columns
            }
        };

        let dataViewPlainNumericMetadata: powerbi.DataViewMetadata = {
            columns: [
                { displayName: "value", type: ValueType.fromDescriptor({ numeric: true }) }
            ]
        };

        let singleRowdata: powerbi.DataView = {
            metadata: dataViewPlainNumericMetadata,
            table: {
                rows: [
                    [123456.789]
                ],
                columns: dataViewPlainNumericMetadata.columns
            }
        };

        let simpleDataView: powerbi.DataView = {
            metadata: { columns: [], segment: {} },
            table: {
                rows: [[1]],
                columns: []
            }
        };

        beforeEach(() => {
            jasmine.clock().install();
            v = <MultiRowCard> powerbi.visuals.visualPluginFactory.create().getPlugin("multiRowCard").create();
            v.init(getVisualInitOptions(element = helpers.testDom("200", "300")));
        });

        afterEach(() => {
            jasmine.clock().uninstall();
        });

        it("Validate multiRowCard category labels style", () => {
            let categoryLabelsData = $.extend(true, {}, data);
            categoryLabelsData.metadata.objects = {
                categoryLabels: {
                    show: true,
                    fontSize: 12,
                    color: { solid: { color: '#123456' } },
                }
            };

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [categoryLabelsData] });

                expect($(".details").first().css('font-size')).toBe('16px');
                expect($(".details").last().css('font-size')).toBe('16px');
                helpers.assertColorsMatch($(".details").first().css('color'), '#123456');
                helpers.assertColorsMatch($(".details").last().css('color'), '#123456');
            });
        });

        it("Validate multiRowCard category labels hide", () => {
            let categoryLabelsData = $.extend(true, {}, data);
            categoryLabelsData.metadata.objects = {
                categoryLabels: {
                    show: false,
                }
            };

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [categoryLabelsData] });
                expect($(".details").height()).toBe(0);
            });
        });

        it("Validate multiRowCard category labels show and hide", () => {
            let categoryLabelsData = $.extend(true, {}, data);
            categoryLabelsData.metadata.objects = {
                categoryLabels: {
                    show: true,
                }
            };

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [categoryLabelsData] });

                categoryLabelsData.metadata.objects = {
                    categoryLabels: {
                        show: false,
                    }
                };

                fireOnDataChanged(v, { dataViews: [categoryLabelsData] });

                expect($(".details").height()).toBe(0);
            });
        });

        it("Validate multiRowCard data labels style", () => {
            let dataLabelsData = $.extend(true, {}, data);
            dataLabelsData.metadata.objects = {
                dataLabels: {
                    show: true,
                    fontSize: 12,
                    color: { solid: { color: '#123456' } },
                }
            };

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [dataLabelsData] });

                expect($(".caption").first().css('font-size')).toBe('16px');
                expect($(".caption").last().css('font-size')).toBe('16px');
                helpers.assertColorsMatch($(".caption").first().css('color'), '#123456');
                helpers.assertColorsMatch($(".caption").last().css('color'), '#123456');
            });
        });

        it("Validate multiRowCard title labels style", () => {
            let titleLabelsData = $.extend(true, {}, dataWithTitle);
            titleLabelsData.metadata.objects = {
                cardTitle: {
                    show: true,
                    fontSize: 12,
                    color: { solid: { color: '#123456' } },
                }
            };

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [titleLabelsData] });

                expect($(".card .title").first().css('font-size')).toBe('16px');
                expect($(".card .title").last().css('font-size')).toBe('16px');
                helpers.assertColorsMatch($(".card .title").first().css('color'), '#123456');
                helpers.assertColorsMatch($(".card .title").last().css('color'), '#123456');
            });
        });

        it("Validate multiRowCard DOM without Title", () => {
            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [data] });

                expect($(".card")).toBeInDOM();
                expect($(".card .title")).not.toBeInDOM();
                expect($(".card .cardItemContainer")).toBeInDOM();
                expect($(".card .cardItemContainer .caption")).toBeInDOM();
                expect($(".card .cardItemContainer .details")).toBeInDOM();

                expect($(".card").length).toBe(2);
                expect($(".card")[0].childElementCount).toBe(3);
                expect($(".cardItemContainer")[0].childElementCount).toBe(2);

                expect($(".caption").last().text()).toBe("category2");
                expect($(".details").last().text()).toBe("category");
            });
        });

        xit("Validate multiRowCard DOM with Title", () => {
            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [dataWithTitle] });

                expect($(".card")).toBeInDOM();
                expect($(".card .cardItemContainer")).toBeInDOM();
                expect($(".card .cardItemContainer .caption")).toBeInDOM();
                expect($(".card .cardItemContainer .details")).toBeInDOM();
                expect($(".card .title")).toBeInDOM();

                expect($(".card").length).toBe(2);
                expect($(".card")[0].childElementCount).toBe(2);
                expect($(".cardItemContainer")[0].childElementCount).toBe(2);

                //height calculated based on font size
                expect($(".title").last().height()).toBe(23);
                expect($(".title").last().text()).toBe("Adventure");
                expect($(".caption").last().text()).toBe("12,345.00");
                expect($(".details").last().text()).toBe("value");
                expect($(".title").last().css('font-size')).toBe("17px");
                helpers.assertColorsMatch($(".title").last().css('color'), '#767676');
            });
        });

        it("Validate that multiRowCard item long caption should be truncated", () => {

            let dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: "Label", type: ValueType.fromDescriptor({ text: true }) },
                    { displayName: "Category", type: ValueType.fromDescriptor({ text: true }) }
                ]
            };

            let data: powerbi.DataView = {
                metadata: dataViewMetadata,
                table: {
                    rows: [
                        ["this is the label that never ends, it just goes on and on my friends.Some axis started rendering it not knowing what it was, and now it keeps on rendering forever just because this the label that never ends", "Category1"]
                    ],
                    columns: dataViewMetadata.columns
                }
            };

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [data] });

                /**
                 * NOTE: This test was never verifying the truncation
                 * The original string, which ended with '...' was always placed in the DOM
                 * CSS text-overflow property with value ellipsis was truncating the text visually
                 * Let's verify the width and visual truncation are working appropriately
                 */
                let label = $(".caption").first();
                helpers.verifyEllipsisActive(label);
            });
        });

        it("Validate multiRowCard converter without Title", () => {
            let cardData = MultiRowCard.converter(data, data.metadata.columns.length, data.table.rows.length);

            expect(cardData.dataModel.length).toBe(2);
            expect(cardData.dataModel).toEqual([
                { title: undefined, showTitleAsURL: false, showTitleAsImage: undefined, showTitleAsKPI: false, cardItemsData: [{ caption: "123,456.79", details: "value", showURL: false, showImage: undefined, showKPI: false, columnIndex: 0 }, { caption: "8/31/1999", details: "date", showURL: false, showImage: undefined, showKPI: false, columnIndex: 1 }, { caption: "category1", details: "category", showURL: false, showImage: undefined, showKPI: false, columnIndex: 2 }] },
                { title: undefined, showTitleAsURL: false, showTitleAsImage: undefined, showTitleAsKPI: false, cardItemsData: [{ caption: "12,345.00", details: "value", showURL: false, showImage: undefined, showKPI: false, columnIndex: 0 }, { caption: "8/1/2014", details: "date", showURL: false, showImage: undefined, showKPI: false, columnIndex: 1 }, { caption: "category2", details: "category", showURL: false, showImage: undefined, showKPI: false, columnIndex: 2 }] }
            ]);
        });

        it("Validate multiRowCard converter With Title", () => {
            let cardData = MultiRowCard.converter(dataWithTitle, dataWithTitle.metadata.columns.length, dataWithTitle.table.rows.length);

            expect(cardData.dataModel.length).toBe(2);
            expect(cardData.dataModel).toEqual([
                { title: "Action", showTitleAsURL: false, showTitleAsImage: undefined, showTitleAsKPI: false, cardItemsData: [{ caption: "123,456.79", details: "value", showURL: false, showImage: undefined, showKPI: false, columnIndex: 0 }] },
                { title: "Adventure", showTitleAsURL: false, showTitleAsImage: undefined, showTitleAsKPI: false, cardItemsData: [{ caption: "12,345.00", details: "value", showURL: false, showImage: undefined, showKPI: false, columnIndex: 0 }] }
            ]);
        });

        it("Validate multiRowCard converter null value", () => {
            let cardData = MultiRowCard.converter(dataWithNullValue, dataWithNullValue.metadata.columns.length, dataWithNullValue.table.rows.length);

            expect(cardData.dataModel.length).toBe(2);
            expect(cardData.dataModel).toEqual([
                { title: "Action", showTitleAsURL: false, showTitleAsImage: undefined, showTitleAsKPI: false, cardItemsData: [{ caption: "(Blank)", details: "value", showURL: false, showImage: undefined, showKPI: false, columnIndex: 0 }] },
                { title: "Adventure", showTitleAsURL: false, showTitleAsImage: undefined, showTitleAsKPI: false, cardItemsData: [{ caption: "(Blank)", details: "value", showURL: false, showImage: undefined, showKPI: false, columnIndex: 0 }] }
            ]);
        });

        it("Validate multiRowCard converter KPI", () => {
            let cardData = MultiRowCard.converter(dataWithKPI, dataWithKPI.metadata.columns.length, dataWithKPI.table.rows.length);

            expect(cardData.dataModel.length).toBe(2);
            expect(cardData.dataModel).toEqual([
                { title: "test1", showTitleAsURL: false, showTitleAsImage: undefined, showTitleAsKPI: false, cardItemsData: [{ caption: "powervisuals-glyph bars-stacked bars-three", details: "KPI", showURL: false, showImage: undefined, showKPI: true, columnIndex: 0 }] },
                { title: "test2", showTitleAsURL: false, showTitleAsImage: undefined, showTitleAsKPI: false, cardItemsData: [{ caption: "powervisuals-glyph bars-stacked bars-four", details: "KPI", showURL: false, showImage: undefined, showKPI: true, columnIndex: 0 }] }
            ]);
        });

        it("Validate that multiRowCard displays title with Empty values", () => {
            let dataWithEmptyTitle: powerbi.DataView = {
                metadata: dataViewMetadataWithTitle,
                table: {
                    rows: [
                        [null, ""],
                        [null, "Adventure"]
                    ],
                    columns: dataViewMetadataWithTitle.columns
                }
            };

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [dataWithEmptyTitle] });

                expect($(".card .title")).toBeInDOM();
                expect($(".title").first().text()).toBe("");
                expect($(".title").last().text()).toBe("Adventure");
            });
        });

        it("Validate that multiRowCard displays title with Web URL values", () => {
            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [dataWithURLTitle] });

                expect($(".card .title a")).toBeInDOM();
                expect($(".title a").last().text()).toBe("http://microsoft.com");
                
            });
        });

        it("Validate that multiRowCard displays card items with Web URL values", () => {
            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [dataWithURLValues] });

                expect($(".card .caption a")).toBeInDOM();
                expect($(".caption a").last().text()).toBe("http://microsoft.com");
            });
        });

        it("Validate that multiRowCard displays KPI", () => {
            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [dataWithKPI] });

                expect($(".card .caption div")).toBeInDOM();
                expect($(".caption div").hasClass('bars-stacked bars-four')).toBeTruthy();
            });
        });

        it("Validate multiRowCard last card styling on dashboard", () => {
            let options = getVisualInitOptions(element = helpers.testDom("400", "400"));

            options.interactivity = { overflow: "hidden" };
            v.init(options);

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [data] });

                let cardItemBottomBorderWidth = parseInt(element.find(".card").last().css("border-bottom-width"), 10);
                let cardItemBottomPadding = parseInt(element.find(".card").last().css("padding-bottom"), 10);
                let cardItemTopPadding = parseInt(element.find(".card").last().css("padding-top"), 10);

                expect(cardItemBottomBorderWidth).toEqual(0);
                expect(cardItemBottomPadding).toEqual(0);
                expect(cardItemTopPadding).toEqual(5);
            });
        });

        it("Validate multiRowCard first card styling on canvas", () => {
            v.init(getVisualInitOptions(element = helpers.testDom("100", "100")));
            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [singleRowdata] });

                let cardBottomMargin = parseInt(element.find(".card").last().css("margin-bottom"), 10);
                expect(cardBottomMargin).toEqual(0);

                helpers.runWithImmediateAnimationFrames(() => {
                    fireOnDataChanged(v, { dataViews: [dataWithTitle] });

                    cardBottomMargin = parseInt(element.find(".card").last().css("margin-bottom"), 10);
                    expect(cardBottomMargin).toEqual(20);

                    helpers.runWithImmediateAnimationFrames(() => {
                        fireOnDataChanged(v, { dataViews: [data] });

                        cardBottomMargin = parseInt(element.find(".card").last().css("margin-bottom"), 10);
                        expect(cardBottomMargin).toEqual(20);
                    });
                });
            });
        });

        it("Validate multiRowCard card styling on dashboard", () => {
            let options = getVisualInitOptions(element = helpers.testDom("400", "400"));

            options.interactivity = { overflow: "hidden" };
            v.init(options);

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [data] });

                let cardItemBottomBorderWidth = parseInt(element.find(".card").first().css("border-bottom-width"), 10);
                let cardItemBottomPadding = parseInt(element.find(".card").first().css("padding-bottom"), 10);
                let cardItemTopPadding = parseInt(element.find(".card").first().css("padding-top"), 10);

                expect($(".card .title")).not.toBeInDOM();
                expect(cardItemBottomBorderWidth).toEqual(1);
                expect(cardItemBottomPadding).toEqual(5);
                expect(cardItemTopPadding).toEqual(5);
                expect($('.card .caption').first().css('font-size')).toBe('13px');
                expect($('.card .details').first().css('font-size')).toBe('12px');
                helpers.assertColorsMatch($('.card .caption').first().css('color'), '#333333');
                helpers.assertColorsMatch($('.card .details').first().css('color'), '#333333');
            });
        });

        it("Validate multiRowCard card styling", () => {
            v.init(getVisualInitOptions(element = helpers.testDom("400", "400")));

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [data] });

                let cardItemBottomBorderWidth = parseInt(element.find(".card").first().css("border-bottom-width"), 10);
                let cardItemBottomPadding = parseInt(element.find(".card").first().css("padding-bottom"), 10);
                let cardItemTopPadding = parseInt(element.find(".card").first().css("padding-top"), 10);

                expect(cardItemBottomBorderWidth).toEqual(0);
                expect(cardItemBottomPadding).toEqual(0);
                expect(cardItemTopPadding).toEqual(0);
                expect($('.card .caption').first().css('font-size')).toBe('13px');
                expect($('.card .details').first().css('font-size')).toBe('12px');
                helpers.assertColorsMatch($('.card .caption').first().css('color'), '#333333');
                helpers.assertColorsMatch($('.card .details').first().css('color'), '#333333');
            });
        });

        it("Validate multiRowCard styling when there is a single card item", () => {
            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [singleRowdata] });

                let cardItemRightMargin = parseInt(element.find(".cardItemContainer").first().css("margin-right"), 10);

                expect(cardItemRightMargin).toEqual(0);
            });
        });

        it("Verify single column item in smallTile ", () => {
            let options = getVisualInitOptions(helpers.testDom("150", "230"));

            options.interactivity = { overflow: "hidden" };
            v.init(options);

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [tableDataViewHelper.getDataWithColumns(1, 10)] });

                expect($(".card")).toBeInDOM();
                expect($(".card .cardItemContainer")).toBeInDOM();

                expect($(".card").length).toBe(3);
                expect($(".card:first>*:visible").length).toBe(1);
                expect($(".card:first>*:visible").text()).not.toEqual('');
            });
        });

        xit("Verify number of cards and card items in smallTile ", () => {
            let options = getVisualInitOptions(helpers.testDom("150", "230"));

            options.interactivity = { overflow: "hidden" };
            v.init(options);

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [tableDataViewHelper.getDataWithColumns(10, 10)] });

                expect($(".card")).toBeInDOM();
                expect($(".card .cardItemContainer")).toBeInDOM();

                expect($(".card").length).toBe(1);
                expect($(".card:first>*:visible").length).toBe(4);
            });
        });

        xit("Verify number of cards and card items in MediumTile ", () => {
            let options = getVisualInitOptions(helpers.testDom("300", "470"));

            options.interactivity = { overflow: "hidden" };
            v.init(options);

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [tableDataViewHelper.getDataWithColumns(10, 10)] });

                expect($(".card")).toBeInDOM();
                expect($(".card .cardItemContainer")).toBeInDOM();

                expect($(".card").length).toBe(3);
                expect($(".card:first>*:visible").length).toBe(6);
            });
        });

        it("Verify number of cards and card items in LargeTile ", () => {
            let options = getVisualInitOptions(helpers.testDom("450", "750"));

            options.interactivity = { overflow: "hidden" };
            v.init(options);

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [tableDataViewHelper.getDataWithColumns(10, 10)] });

                expect($(".card")).toBeInDOM();
                expect($(".card .cardItemContainer")).toBeInDOM();

                expect($(".card").length).toBeGreaterThan(8);
                expect($(".card").length).toBeLessThan(11);
                expect($(".card:first>*:visible").length).toBe(6);
                
            });
        });

        it("Validate multiRowCard cardrow column width for default width", () => {
            v.init(getVisualInitOptions(element = helpers.testDom("100", "760")));

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [tableDataViewHelper.getDataWithColumns(15, 15)] });

                expect($(".card")).toBeInDOM();
                expect($(".card .cardItemContainer")).toBeInDOM();
                let width = element.find(".cardItemContainer").last().innerWidth();

                // To prevent this test from being fragile, compare the width within an acceptable range. Expected value: ~125px
                expect(helpers.isCloseTo(width, /*expected*/ 125, /*tolerance*/ 5)).toBeTruthy();
            });
        });

        it("Card should be cleared when there is a empty dataview ", () => {
            let dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: "value", type: ValueType.fromDescriptor({ numeric: true }) }
                ]
            };

            let data: powerbi.DataView = {
                metadata: dataViewMetadata,
                table: {
                    rows: [
                        [123456.789]
                    ],
                    columns: dataViewMetadata.columns
                }
            };

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [data] });

                expect($(".card").length).toBe(1);

                dataViewMetadata = {
                    columns: []
                };
                data = {
                    metadata: dataViewMetadata,
                    table: {
                        rows: [],
                        columns: dataViewMetadata.columns
                    }
                };

                helpers.runWithImmediateAnimationFrames(() => {
                    fireOnDataChanged(v, { dataViews: [data] });

                    expect($(".card").length).toBe(0);
                });
            });
        });

        it("Card should format values", () => {
            let dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: "value", type: ValueType.fromDescriptor({ numeric: true }), objects: { general: { formatString: "0%" } } }
                ]
            };

            let data: powerbi.DataView = {
                metadata: dataViewMetadata,
                table: {
                    rows: [
                        [.22]
                    ],
                    columns: dataViewMetadata.columns
                }
            };

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [data] });

                expect($(".card").length).toBe(1);
                expect($(".card .caption").last().text()).toBe("22%");
                
            });
        });

        it("Card should not call loadMoreData ", () => {
            let data: powerbi.DataView = {
                metadata: { columns: [] },
                table: { rows: [[1]], columns: [] }
            };

            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [data] });
                let listViewOptions: powerbi.visuals.ListViewOptions = <powerbi.visuals.ListViewOptions>v["listView"]["options"];
                let loadMoreSpy = spyOn(hostServices, "loadMoreData");
                listViewOptions.loadMoreData();

                expect(loadMoreSpy).not.toHaveBeenCalled();
                
            });
        });

        it("Card should call loadMoreData ", () => {
            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [simpleDataView] });

                let listViewOptions: powerbi.visuals.ListViewOptions = <powerbi.visuals.ListViewOptions>v["listView"]["options"];
                let loadMoreSpy = spyOn(hostServices, "loadMoreData");
                helpers.runWithImmediateAnimationFrames(() => {
                    listViewOptions.loadMoreData();

                    expect(loadMoreSpy).toHaveBeenCalled();
                });
            });
        });

        it("Card already called loadMoreData", () => {
            helpers.runWithImmediateAnimationFrames(() => {
                fireOnDataChanged(v, { dataViews: [simpleDataView] });

                let listViewOptions: powerbi.visuals.ListViewOptions = <powerbi.visuals.ListViewOptions>v["listView"]["options"];
                let loadMoreSpy = spyOn(hostServices, "loadMoreData");
                listViewOptions.loadMoreData();
                listViewOptions.loadMoreData();

                expect(loadMoreSpy.calls.all().length).toBe(1);
                
            });
        });

        function getVisualInitOptions(element: JQuery): powerbi.VisualInitOptions {
            return {
                element: element,
                host: hostServices,
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                }
            };
        }

        function fireOnDataChanged(visual: powerbi.visuals.MultiRowCard, options: powerbi.VisualDataChangedOptions) {
            visual.onDataChanged(options);

            // Multi-row cards require 2 ticks
            jasmine.clock().tick(0);
            jasmine.clock().tick(0);
        }
    });
}