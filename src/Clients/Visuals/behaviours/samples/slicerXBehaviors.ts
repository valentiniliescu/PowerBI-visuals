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
    export interface SlicerXBehaviorOptions {
        slicerItemContainers: D3.Selection;
        slicerItemLabels: D3.Selection;
        slicerItemInputs: D3.Selection;
        slicerClear: D3.Selection;
        dataPoints: SlicerXDataPoint[];
        interactivityService: IInteractivityService;
        slicerSettings: SlicerXSettings;
    }

    export class SlicerXWebBehavior implements IInteractiveBehavior {
        private slicers: D3.Selection;
        private slicerItemLabels: D3.Selection;
        private slicerItemInputs: D3.Selection;
        private dataPoints: SlicerXDataPoint[];
        private interactivityService: IInteractivityService;
        private slicerSettings: SlicerXSettings;

        public bindEvents(options: SlicerXBehaviorOptions, selectionHandler: ISelectionHandler): void {
            let filterPropertyId = slicerXProps.filterPropertyIdentifier;
            let slicers = this.slicers = options.slicerItemContainers;
            this.slicerItemLabels = options.slicerItemLabels;
            this.slicerItemInputs = options.slicerItemInputs;
            let slicerClear = options.slicerClear;
            this.dataPoints = options.dataPoints;
            this.interactivityService = options.interactivityService;
            this.slicerSettings = options.slicerSettings;

            slicers.on("mouseover", (d: SlicerXDataPoint) => {
                if (d.selectable) {
                    d.mouseOver = true;
                    d.mouseOut = false;
                    this.renderMouseover();
                }
            });

            slicers.on("mouseout", (d: SlicerXDataPoint) => {
                if (d.selectable) {
                    d.mouseOver = false;
                    d.mouseOut = true;
                    this.renderMouseover();
                }
            });

            slicers.on("click", (d: SlicerXDataPoint, index) => {
                if (d.selectable) {
                    let settings = this.slicerSettings;
                    d3.event.preventDefault();
                    if (d3.event.altKey && settings.general.multiselect) {
                        let selectedIndexes = jQuery.map(this.dataPoints, function(d, index) { if (d.selected) return index; });
                        let selIndex = selectedIndexes.length > 0 ? (selectedIndexes[selectedIndexes.length - 1]) : 0;
                        selIndex = selIndex > index ? 0 : selIndex;
                        selectionHandler.handleClearSelection();
                        for (let i = selIndex; i <= index; i++) {
                            selectionHandler.handleSelection(this.dataPoints[i], true /* isMultiSelect */);
                        }
                    }
                    else if (d3.event.ctrlKey && settings.general.multiselect) {
                        selectionHandler.handleSelection(d, true /* isMultiSelect */);
                    }
                    else {
                        selectionHandler.handleSelection(d, false /* isMultiSelect */);
                    }
                    selectionHandler.persistSelectionFilter(filterPropertyId);
                }
            });

            slicerClear.on("click", (d: SelectableDataPoint) => {

                selectionHandler.handleClearSelection();
                selectionHandler.persistSelectionFilter(filterPropertyId);

            });
        }

        public renderSelection(hasSelection: boolean): void {
            if (!hasSelection && !this.interactivityService.isSelectionModeInverted()) {
                this.slicers.style('background', this.slicerSettings.slicerText.unselectedColor);
            }
            else {
                this.styleSlicerInputs(this.slicers, hasSelection);
            }
        }

        private renderMouseover(): void {
            this.slicerItemLabels.style({
                'color': (d: SlicerXDataPoint) => {
                    if (d.mouseOver)
                        return this.slicerSettings.slicerText.hoverColor;

                    if (d.mouseOut) {
                        if (d.selected)
                            return this.slicerSettings.slicerText.fontColor;
                        else
                            return this.slicerSettings.slicerText.fontColor;
                    }
                }
            });
        }

        public styleSlicerInputs(slicers: D3.Selection, hasSelection: boolean) {
            let settings = this.slicerSettings;
            slicers.each(function(d: SlicerXDataPoint) {
                d3.select(this).style({
                    'background': d.selectable ? (d.selected ? settings.slicerText.selectedColor : settings.slicerText.unselectedColor)
                        : settings.slicerText.disabledColor
                });
            });
        }
    }
}
