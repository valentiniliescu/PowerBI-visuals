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
    import ILegend = powerbi.visuals.ILegend;
    import LegendIcon = powerbi.visuals.LegendIcon;
    import LegendPosition = powerbi.visuals.LegendPosition;
    import IInteractivityService = powerbi.visuals.IInteractivityService;
    import IVisualHostServices = powerbi.IVisualHostServices;
    import Helpers = powerbitests.helpers;
    import MockBehavior = powerbitests.mocks.MockBehavior;

    describe("DOM validation", () => {
        let element: JQuery;
        let viewport: powerbi.IViewport;
        let legend: ILegend;
        let interactivityService: IInteractivityService;
        let hostServices: IVisualHostServices;
        let legendData: powerbi.visuals.LegendDataPoint[];

        beforeEach(() => {
            powerbitests.mocks.setLocale();

            element = powerbitests.helpers.testDom('500', '500');
            hostServices = powerbitests.mocks.createVisualHostServices();
            
            // Allow multiselect
            hostServices.canSelect = () => true;
            interactivityService = powerbi.visuals.createInteractivityService(hostServices);
            legend = powerbi.visuals.createLegend(element, false, interactivityService, true);
            viewport = {
                height: element.height(),
                width: element.width()
            };

            legendData = [
                { label: 'California', color: '#ff0000', icon: LegendIcon.Line, identity: createSelectionIdentity(0), selected: false },
                { label: 'Texas', color: '#0000ff', icon: LegendIcon.Line, identity: createSelectionIdentity(1), selected: false },
                { label: 'Washington', color: '#00ff00', icon: LegendIcon.Line, identity: createSelectionIdentity(2), selected: false }
            ];
        });

        it('legend dom validation one legend item count validation', (done) => {
            legend.drawLegend({
                dataPoints: [
                    legendData[0],
                ]
            }, viewport);

            setTimeout(() => {
                expect($('.legendItem').length).toBe(1);
                expect($('.legendText').length).toBe(1);
                expect($('.legendIcon').length).toBe(1);
                done();
            }, DefaultWaitForRender);
        });

        it('legend dom validation three legend items count validation', (done) => {
            legend.drawLegend({ dataPoints: legendData }, viewport);
            setTimeout(() => {
                expect($('.legendItem').length).toBe(3);
                expect($('.legendText').length).toBe(3);
                expect($('.legendIcon').length).toBe(3);
                done();
            }, DefaultWaitForRender);
        });

        it('legend dom validation three legend items first item text', (done) => {
            legend.reset();
            legend.drawLegend({ dataPoints: legendData }, viewport);
            setTimeout(() => {
                expect($('.legendText').first().text()).toBe('California');
                done();
            }, DefaultWaitForRender);
        });

        it('legend dom validation three legend items last item text', (done) => {
            legend.drawLegend({ dataPoints: legendData }, viewport);
            setTimeout(() => {
                expect($('.legendText').last().text()).toBe('Washington');
                done();
            }, DefaultWaitForRender);
        });

        it('legend dom validation three legend items colors count', (done) => {
            legend.drawLegend({ dataPoints: legendData }, viewport);
            setTimeout(() => {
                expect($('.legendIcon').length).toBe(3);
                done();
            }, DefaultWaitForRender);
        });

        it('legend dom validation three legend items with shared label and color', (done) => {
            let legendData: powerbi.visuals.LegendDataPoint[] = [
                { label: 'ACCESS_VIOLA...', color: '#ff0000', icon: LegendIcon.Line, identity: createSelectionIdentity(1), selected: false },
                { label: 'ACCESS_VIOLA...', color: '#ff0000', icon: LegendIcon.Line, identity: createSelectionIdentity(2), selected: false },
                { label: 'BREAKPOINT', color: '#00ff00', icon: LegendIcon.Line, identity: createSelectionIdentity(3), selected: false }
            ];
            legend.drawLegend({ dataPoints: legendData }, viewport);
            setTimeout(() => {
                expect($('.legendItem').length).toBe(3);
                expect($('.legendText').length).toBe(3);
                expect($('.legendIcon').length).toBe(3);
                done();
            }, DefaultWaitForRender);
        });

        it('legend dom validation three legend items but two share same identity', (done) => {
            let legendData: powerbi.visuals.LegendDataPoint[] = [
                { label: 'ACCESS_VIOLA...', color: '#ff0000', icon: LegendIcon.Line, identity: createSelectionIdentity(1), selected: false },
                { label: 'ACCESS_VIOLA...', color: '#ff0000', icon: LegendIcon.Line, identity: createSelectionIdentity(1), selected: false },
                { label: 'BREAKPOINT', color: '#00ff00', icon: LegendIcon.Line, identity: createSelectionIdentity(3), selected: false }
            ];
            legend.drawLegend({ dataPoints: legendData }, viewport);
            setTimeout(() => {
                expect($('.legendItem').length).toBe(2);
                expect($('.legendText').length).toBe(2);
                expect($('.legendIcon').length).toBe(2);
                done();
            }, DefaultWaitForRender);
        });

        it('legend dom validation incremental build', (done) => {
            
            // Draw the legend once with the 3 states
            legend.drawLegend({ dataPoints: legendData }, viewport);
            setTimeout(() => {
                validateLegendDOM(legendData);

                // Draw the legend against with a new state at the start
                let updatedData: powerbi.visuals.LegendDataPoint[] = [
                    { label: 'Alaska', color: '#fff000', icon: LegendIcon.Box, identity: createSelectionIdentity(0), selected: false },
                    { label: 'California', color: '#fff00d', icon: LegendIcon.Box, identity: createSelectionIdentity(1), selected: false },
                    { label: 'Texas', color: '#fffe00', icon: LegendIcon.Box, identity: createSelectionIdentity(2), selected: false },
                    { label: 'Washington', color: '#0000dd', icon: LegendIcon.Box, identity: createSelectionIdentity(3), selected: false }
                ];
                legend.reset();
                legend.drawLegend({ dataPoints: updatedData }, viewport);
                setTimeout(() => {
                    validateLegendDOM(updatedData);
                    done();
                }, DefaultWaitForRender);
            }, DefaultWaitForRender);
        });

        describe('Legend interactivity tests', () => {
            let icons: JQuery;

            beforeEach(() => {
                legend.drawLegend({ dataPoints: legendData }, viewport);
                icons = $('.legendIcon');
                spyOn(hostServices, 'onSelect').and.callThrough();
            });

            it('Default state', () => {
                helpers.assertColorsMatch(icons[0].style.fill, '#ff0000');
                helpers.assertColorsMatch(icons[1].style.fill, '#0000ff');
                helpers.assertColorsMatch(icons[2].style.fill, '#00ff00');
            });

            it('Click first legend', () => {
                (<any>icons.first()).d3Click(0, 0);
                helpers.assertColorsMatch(icons[0].style.fill, '#ff0000');
                helpers.assertColorsMatch(icons[1].style.fill, '#a6a6a6');
                helpers.assertColorsMatch(icons[2].style.fill, '#a6a6a6');
            });

            it('Click the last legend item, should just select current and clear others', () => {
                (<any>icons.first()).d3Click(0, 0);
                helpers.assertColorsMatch(icons[0].style.fill, '#ff0000');
                helpers.assertColorsMatch(icons[1].style.fill, '#a6a6a6');
                helpers.assertColorsMatch(icons[2].style.fill, '#a6a6a6');

                (<any>icons.last()).d3Click(0, 0);
                helpers.assertColorsMatch(icons[0].style.fill, '#a6a6a6');
                helpers.assertColorsMatch(icons[1].style.fill, '#a6a6a6');
                helpers.assertColorsMatch(icons[2].style.fill, '#00ff00');
            });

            it('Control + Click legend item, should multiselect', () => {
                (<any>icons.last()).d3Click(0, 0);
                helpers.assertColorsMatch(icons[0].style.fill, '#a6a6a6');
                helpers.assertColorsMatch(icons[1].style.fill, '#a6a6a6');
                helpers.assertColorsMatch(icons[2].style.fill, '#00ff00');

                (<any>icons.first()).d3Click(0, 0, powerbitests.helpers.ClickEventType.CtrlKey);
                helpers.assertColorsMatch(icons[0].style.fill, '#ff0000');
                helpers.assertColorsMatch(icons[1].style.fill, '#a6a6a6');
                helpers.assertColorsMatch(icons[2].style.fill, '#00ff00');
            });

            it('Click the clear catcher should clear the legend selection', () => {
                (<any>icons.first()).d3Click(0, 0);
                helpers.assertColorsMatch(icons[0].style.fill, '#ff0000');
                helpers.assertColorsMatch(icons[1].style.fill, '#a6a6a6');
                helpers.assertColorsMatch(icons[2].style.fill, '#a6a6a6');

                (<any>($('.clearCatcher').first())).d3Click(0, 0);
                helpers.assertColorsMatch(icons[0].style.fill, '#ff0000');
                helpers.assertColorsMatch(icons[1].style.fill, '#0000ff');
                helpers.assertColorsMatch(icons[2].style.fill, '#00ff00');
            });

            describe('with pre-existing selection state', () => {
                beforeEach(() => {
                    let mockDatapoints = [
                        { label: 'California', color: '#ff0000', identity: createSelectionIdentity(0), selected: false },
                        { label: 'Texas', color: '#0000ff', identity: createSelectionIdentity(1), selected: false },
                        { label: 'Washington', color: '#00ff00', identity: createSelectionIdentity(2), selected: false }
                    ];
                    
                    let mockBehavior = new MockBehavior(mockDatapoints, null);
                    interactivityService.bind(mockDatapoints, mockBehavior, null);
                    mockBehavior.selectIndex(1);

                    legend.drawLegend({ dataPoints: legendData }, viewport);
                });

                it('has correct selection fill', () => {
                    helpers.assertColorsMatch(icons[0].style.fill, '#a6a6a6');
                    helpers.assertColorsMatch(icons[1].style.fill, '#0000ff');
                    helpers.assertColorsMatch(icons[2].style.fill, '#a6a6a6');
                });

                it('click selects corresponding item', () => {
                    (<any>icons.first()).d3Click(0, 0);
                    helpers.assertColorsMatch(icons[0].style.fill, '#ff0000');
                    helpers.assertColorsMatch(icons[1].style.fill, '#a6a6a6');
                    helpers.assertColorsMatch(icons[2].style.fill, '#a6a6a6');
                });

                it('ctrl+click adds item to current selection', () => {
                    (<any>icons.first()).d3Click(0, 0, powerbitests.helpers.ClickEventType.CtrlKey);
                    helpers.assertColorsMatch(icons[0].style.fill, '#ff0000');
                    helpers.assertColorsMatch(icons[1].style.fill, '#0000ff');
                    helpers.assertColorsMatch(icons[2].style.fill, '#a6a6a6');
                });
            });
        });

        it('legend defaults', () => {
            let legendArray = getLotsOfLegendData();
            let legendData: powerbi.visuals.LegendData = { dataPoints: legendArray, title: '' };
            let props: powerbi.DataViewObject = {};

            powerbi.visuals.LegendData.update(legendData, props);

            expect(props[powerbi.visuals.legendProps.show]).toBe(true);
            expect(props[powerbi.visuals.legendProps.position]).toEqual(powerbi.visuals.legendPosition.top);
        });

        it('legend with title', () => {
            let legendData = getLotsOfLegendData();
            legend.drawLegend({ dataPoints: legendData, title: 'states' }, viewport);
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.legendTitle').length).toBe(1);
        });

        xit('legend with long title on Right', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Right);
            legend.drawLegend({ dataPoints: legendData, title: 'This is a super long title and should be truncated by now' }, viewport);
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            
            // 2 different possible values
            // 'This is a super long ti… in Windows
            // 'This is a super long ti … in Mac OS
            // So check start part of the text, tail part and length
            let text = $('.legendTitle').text();
            expect(text.substr(0, 23)).toEqual('This is a super long ti');
            expect(text.substr(text.length - 3, 3)).toEqual('…');
            expect(Helpers.isInRange(text.length, 25, 26)).toBe(true);
        });

        it('legend no title', () => {
            let legendData = getLotsOfLegendData();
            legend.drawLegend({ dataPoints: legendData }, viewport);
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.legendTitle').length).toBe(0);
        });

        it('legend Top & horizontal trim', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Top);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.legendItem').length).toBeGreaterThan(5);
            expect($('.legendItem').length).toBeLessThan(52);
        });

        it('legend Bottom & horizontal trim', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Bottom);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.legendItem').length).toBeGreaterThan(5);
            expect($('.legendItem').length).toBeLessThan(52);
        });

        it('legend Left & vertical trim', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Left);
            legend.drawLegend({ dataPoints: legendData }, { height: 200, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.legendItem').length).toBeGreaterThan(5);
            expect($('.legendItem').length).toBeLessThan(52);
        });

        it('legend Right & vertical trim', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Right);
            legend.drawLegend({ dataPoints: legendData }, { height: 200, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.legendItem').length).toBeGreaterThan(5);
            expect($('.legendItem').length).toBeLessThan(52);
        });

        it('Intelligent Layout: Low label count should result in longer max-width', () => {
            let legendData = [{
                label: 'Really long label, but i have the space to show',
                color: 'red',
                icon: LegendIcon.Line,
                identity: powerbi.visuals.SelectionId.createNull(), selected: false
            }];
            legend.changeOrientation(LegendPosition.Top);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.legendItem').length).toBe(1);
            expect($($('.legendText')[0]).text()).not.toContain('…');
        });

        it('Intelligent Layout: Lots of small labels should get compacted in horizontal layout', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Top);
            legend.drawLegend({ dataPoints: legendData, fontSize:8 }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.legendItem').length).toBeLessThan(28);
            expect($('.legendItem').length).toBeGreaterThan(20);
        });

        it('Intelligent Layout: If labels in horizontal layout have small widths, width of legend should be small', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Right);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect(legend.getMargins().width).toBeLessThan(200);
        });

        it('Intelligent Layout: If labels in horizontal layout have large widths, width of legend should be 30% of viewport', () => {
            let legendData = [{
                label: 'I am a really long label, but you should not allow me to take more than 300px',
                color: 'red',
                icon: LegendIcon.Line,
                identity: powerbi.visuals.SelectionId.createNull(), selected: false
            }];
            legend.changeOrientation(LegendPosition.Right);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect(legend.getMargins().width).toBe(300);
        });

        it('Intelligent Layout: Only right arrow shown at start ', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Top);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(1);
        });

        it('Intelligent Layout: No arrows when you have enough horizontal space ', () => {
            let legendData = [{
                label: 'Skywalker',
                color: 'red',
                icon: LegendIcon.Line,
                identity: powerbi.visuals.SelectionId.createNull(), selected: false
            },{
                label: 'The End',
                color: 'blue',
                icon: LegendIcon.Line,
                identity: powerbi.visuals.SelectionId.createNull(), selected: false
            }];

            legend.changeOrientation(LegendPosition.Bottom);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(0);
        });

        it('Intelligent Layout: No arrows when you have enough vertical space ', () => {
            let legendData = [{
                label: 'Skywalker',
                color: 'red',
                icon: LegendIcon.Line,
                identity: powerbi.visuals.SelectionId.createNull(), selected: false
            }, {
                    label: 'The End',
                    color: 'blue',
                    icon: LegendIcon.Line,
                    identity: powerbi.visuals.SelectionId.createNull(), selected: false
                }];
            legend.changeOrientation(LegendPosition.Right);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(0);
        });

        it('Intelligent Layout: No arrows when you have enough horizontal space, but appears on resize ', () => {
            let legendData = [{
                label: 'Skywalker',
                color: 'red',
                icon: LegendIcon.Line,
                identity: powerbi.visuals.SelectionId.createNull(), selected: false
            }, {
                    label: 'The End',
                    color: 'blue',
                    icon: LegendIcon.Line,
                    identity: powerbi.visuals.SelectionId.createNull(), selected: false
                }];
            legend.changeOrientation(LegendPosition.Top);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(0);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 100 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(1);
        });

        it('Intelligent Layout: No arrows when you have enough vertical space, but appears on resize ', () => {
            let legendData = [{
                label: 'Skywalker',
                color: 'red',
                icon: LegendIcon.Line,
                identity: powerbi.visuals.SelectionId.createNull(), selected: false
            }, {
                    label: 'The End',
                    color: 'blue',
                    icon: LegendIcon.Line,
                    identity: powerbi.visuals.SelectionId.createNull(), selected: false
                }];
            legend.changeOrientation(LegendPosition.Right);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(0);
            legend.drawLegend({ dataPoints: legendData }, { height: 20, width: 100 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(1);
        });

        it('Intelligent Layout: Only down arrow shown at start ', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Right);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(1);
        });

        it('Intelligent Layout: Only down arrow shown at start ', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Right);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(1);
        });

        it('Intelligent Layout: Second arrow appears when you page right', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Top);
            legend.drawLegend({ dataPoints: legendData}, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(1);
            (<any>$('.navArrow').first()).d3Click(0, 0);
            expect($('.navArrow').length).toBe(2);
        });

        it('Intelligent Layout: Second arrow appears when you page down', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Left);
            legend.drawLegend({ dataPoints: legendData }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(1);
            (<any>$('.navArrow').first()).d3Click(0, 0);
            expect($('.navArrow').length).toBe(2);
        });

        it('Intelligent Layout: Second arrow disappears when you page rigth to last page', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Top);
            legend.drawLegend({ dataPoints: legendData, fontSize:8 }, { height: 100, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(1);
            (<any>$('.navArrow').first()).d3Click(0, 0);
            expect($('.navArrow').length).toBe(2);
            (<any>$('.navArrow').last()).d3Click(0, 0);
            expect($('.navArrow').length).toBe(1);
        });

        it('Intelligent Layout: Second arrow disappears when you page down to last page', () => {
            let legendData = getLotsOfLegendData();
            legend.changeOrientation(LegendPosition.Right);
            legend.drawLegend({ dataPoints: legendData }, { height: 500, width: 1000 });
            powerbi.visuals.SVGUtil.flushAllD3Transitions();
            expect($('.navArrow').length).toBe(1);
            (<any>$('.navArrow').first()).d3Click(0, 0);
            expect($('.navArrow').length).toBe(2);
            (<any>$('.navArrow').last()).d3Click(0, 0);
            expect($('.navArrow').length).toBe(1);
        });

        function validateLegendDOM(expectedData: powerbi.visuals.LegendDataPoint[]): void {
            let len = expectedData.length;
            let labels = $('.legendText');
            expect(labels.length).toBe(len);

            let icons = $('.legendIcon');
            expect(icons.length).toBe(len);

            for (let i = 0; i < len; ++i) {
                let expectedDatum = expectedData[i];
                expect($(labels.get(i)).text()).toBe(expectedDatum.label);
                helpers.assertColorsMatch(icons.eq(i).css('fill'), expectedDatum.color);
            }
        }
    });

    describe("Mobile: interactive legend DOM validation", () => {
        let element: JQuery;
        let viewport: powerbi.IViewport;
        let legend: ILegend;
        let colorStyle = 'color: {0};';
        let defaultLegendHeight = 65;
        let interactivityService: IInteractivityService;

        let legendData: powerbi.visuals.LegendDataPoint[] = [
            { category: 'state', label: 'Alaska', color: 'red', icon: LegendIcon.Box, measure: 0, identity: createSelectionIdentity(1), selected: false },
            { category: 'state', label: 'California', color: 'blue', icon: LegendIcon.Box, measure: 5, identity: createSelectionIdentity(2), selected: false },
            { category: 'state', label: 'Texas', color: 'green', icon: LegendIcon.Box, measure: 10, identity: createSelectionIdentity(3), selected: false },
        ];

        beforeEach(() => {
            element = powerbitests.helpers.testDom('500', '500');
            let hostServices = powerbitests.mocks.createVisualHostServices();
            interactivityService = powerbi.visuals.createInteractivityService(hostServices);
            legend = powerbi.visuals.createLegend(element, true, interactivityService);
        });

        describe('3 item legend', () => {
            it('legend dom validation one legend item count validation', (done) => {
                legend.drawLegend({
                    dataPoints: [
                        legendData[1],
                    ]
                }, viewport);

                setTimeout(() => {
                    expect($('.interactive-legend .title').length).toBe(1);
                    expect($('.interactive-legend .item').length).toBe(1);
                    done();
                }, DefaultWaitForRender);
            });

            it('legend dom validation three legend items count validation', (done) => {
                legend.drawLegend({ dataPoints: legendData }, viewport);
                setTimeout(() => {
                    expect($('.interactive-legend .title').length).toBe(1);
                    expect($('.interactive-legend .item').length).toBe(3);
                    done();
                }, DefaultWaitForRender);
            });

            it('legend dom validation three legend items first item name and measure', (done) => {
                legend.drawLegend({ dataPoints: legendData }, viewport);
                setTimeout(() => {
                    expect($('.interactive-legend .title').text()).toBe(legendData[0].category);
                    expect($('.interactive-legend .item').first().find('.itemName').text().trim()).toBe('Alaska');
                    expect($('.interactive-legend .item').first().find('.itemMeasure').text().trim()).toBe('0');
                    done();
                }, DefaultWaitForRender);
            });

            it('legend dom validation three legend items last item name and measure', (done) => {
                legend.drawLegend({ dataPoints: legendData }, viewport);
                setTimeout(() => {
                    expect($('.interactive-legend .title').text()).toBe(legendData[0].category);
                    
                    // last item is actually the second item since values should be placed in a two-row table.
                    expect($('.interactive-legend .item').last().find('.itemName').text().trim()).toBe('California');
                    expect($('.interactive-legend .item').last().find('.itemMeasure').text().trim()).toBe('5');
                    done();
                }, DefaultWaitForRender);
            });

            it('legend dom validation three legend items colors count', (done) => {
                legend.drawLegend({ dataPoints: legendData }, viewport);
                setTimeout(() => {
                    expect($('.interactive-legend .icon').length).toBe(3);
                    done();
                }, DefaultWaitForRender);
            });

            // Legend Height tests - legend height is constant regardless of data.
            it('legend getHeight empty', () => {
                expect(legend.getMargins().height).toBe(defaultLegendHeight);
            });

            it('legend getHeight no data', () => {
                legend.drawLegend({ dataPoints: [] }, viewport);

                expect(legend.getMargins().height).toBe(defaultLegendHeight);
            });

            it('legend getHeight data', () => {
                legend.drawLegend({ dataPoints: legendData }, viewport);

                expect(legend.getMargins().height).toBe(defaultLegendHeight);
            });

            it('legend getHeight one data point', () => {
                legend.drawLegend({
                    dataPoints: [
                        legendData[0]
                    ]
                }, viewport);

                expect(legend.getMargins().height).toBe(defaultLegendHeight);
            });

            it('legend dom validation incremental build', (done) => {
                
                // Draw the legend once with the 3 states
                let initialData: powerbi.visuals.LegendDataPoint[] = legendData;

                legend.drawLegend({ dataPoints: initialData }, viewport);
                setTimeout(() => {
                    validateLegendDOM(initialData);

                    // Draw the legend against with a new state at the start
                    let updatedData: powerbi.visuals.LegendDataPoint[] = [
                        legendData[0],
                        legendData[1],
                        legendData[2],
                        { category: 'state', label: 'Washington', color: 'orange', icon: LegendIcon.Box, measure: 15, identity: powerbi.visuals.SelectionId.createNull(), selected: false },
                    ];
                    legend.reset();
                    legend.drawLegend({ dataPoints: updatedData }, viewport);
                    setTimeout(() => {
                        validateLegendDOM(updatedData);
                        done();
                    }, DefaultWaitForRender);
                }, DefaultWaitForRender);
            });

        });

        function validateLegendDOM(expectedData: powerbi.visuals.LegendDataPoint[]): void {
            let len = expectedData.length;
            let items = $('.interactive-legend .item');
            expect($('.interactive-legend .title').length).toBe(1);
            expect(items.length).toBe(len);

            let icons = $('.interactive-legend .icon');
            expect(icons.length).toBe(len);

            // items are returned from the table, first row and then second row.
            // rearrage it to match the way the legend outputs it: by columns.
            let rearrangedItems = [];
            let rearrangedIcons = [];

            for (let i = 0; i < len; i = i + 2) {
                rearrangedItems.push($(items.get(i)));
                rearrangedIcons.push($(icons.get(i)));
            }
            for (let i = 1; i < len; i = i + 2) {
                rearrangedItems.push($(items.get(i)));
                rearrangedIcons.push($(icons.get(i)));
            }

            for (let i = 0; i < len; ++i) {
                let expectedDatum = expectedData[i];
                let item = rearrangedItems[i];
                let icon = rearrangedIcons[i];

                expect(item.find('.itemName').text()).toBe(expectedDatum.label);
                expect(item.find('.itemMeasure').text().trim()).toBe(expectedDatum.measure.toString());
                expect(icon.attr('style').trim()).toBe(jsCommon.StringExtensions.format(colorStyle, expectedDatum.color));
            }
        }
    });

    function createSelectionIdentity(key: number|string): powerbi.visuals.SelectionId {
        return powerbi.visuals.SelectionId.createWithId(powerbitests.mocks.dataViewScopeIdentity('identity' + key));
    }

    function getLotsOfLegendData(): powerbi.visuals.LegendDataPoint[] {
        let states = ['AL', 'AK', 'AS', 'AZ', 'AR', 'CA', 'CO',
            'CT', 'DE', 'DC', 'FM', 'FL', 'GA', 'GU', 'HI', 'ID',
            'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MH', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
            'NJ', 'NM', 'NY', 'NC', 'ND', 'MP', 'OH', 'OK', 'OR',
            'PW', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT',
            'VT', 'VI', 'VA', 'WA', 'WV', 'WI', 'WY', 'AE', 'AA',
            'AP'];

        let colors = d3.scale.category20c();
        let legendData: powerbi.visuals.LegendDataPoint[] = [];
        for (let i = 0; i < states.length; i++) {
            legendData.push({
                label: states[i],
                color: colors(i),
                icon: LegendIcon.Line,
                identity: createSelectionIdentity(i),
                selected: false,
            });
        }

        return legendData;
    }
}
