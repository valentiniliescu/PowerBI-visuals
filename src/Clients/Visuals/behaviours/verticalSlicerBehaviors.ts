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

module powerbi.visuals {
    export interface VerticalSlicerBehaviorOptions extends SlicerBehaviorOptions {
        itemContainers: D3.Selection;
        itemInputs: D3.Selection;
    }

    export class VerticalSlicerWebBehavior implements IInteractiveBehavior {
        private itemLabels: D3.Selection;
        private itemInputs: D3.Selection;
        private dataPoints: SlicerDataPoint[];
        private interactivityService: IInteractivityService;
        private settings: SlicerSettings;

        public bindEvents(options: VerticalSlicerBehaviorOptions, selectionHandler: ISelectionHandler): void {
            let slicers = options.itemContainers;

            this.itemLabels = options.itemLabels;
            this.itemInputs = options.itemInputs;
            this.dataPoints = options.dataPoints;
            this.interactivityService = options.interactivityService;
            this.settings = options.settings;

            SlicerWebBehavior.bindSlicerEvents(options.slicerContainer, slicers, options.clear, selectionHandler, this.settings, this.interactivityService);
        }

        public renderSelection(hasSelection: boolean): void {
            SlicerWebBehavior.setSelectionOnSlicerItems(this.itemInputs, this.itemLabels, hasSelection, this.interactivityService, this.settings);
        }
    }
}  