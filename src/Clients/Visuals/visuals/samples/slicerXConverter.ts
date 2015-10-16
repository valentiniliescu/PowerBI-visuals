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

    interface ConvertedDataPoint {
        identity: SelectionId;
        measureFormat: string;
        measureValue: MeasureAndValue;
        highlightMeasureValue: MeasureAndValue;
        index: number;
        label: any;
        categoryLabel: string;
        //  color: string;
        seriesIndex?: number;
    };

    interface MeasureAndValue {
        measure: number;
        value: number;
    }

    export class SlicerXConverter {
        private dataViewCategorical: DataViewCategorical;
        private dataViewMetadata: DataViewMetadata;
        private seriesCount: number;
        private category: DataViewCategoryColumn;
        private categoryIdentities: DataViewScopeIdentity[];
        private categoryValues: any[];
        private categoryColumnRef: data.SQExpr[];
        private categoryFormatString: string;
        private interactivityService: IInteractivityService;

        public numberOfCategoriesSelectedInData: number;
        public dataPoints: SlicerXDataPoint[];
        public hasSelectionOverride: boolean;

        public constructor(dataView: DataView, interactivityService: IInteractivityService) {

            let dataViewCategorical = dataView.categorical;
            this.dataViewCategorical = dataViewCategorical;
            this.dataViewMetadata = dataView.metadata;
            this.seriesCount = dataViewCategorical.values ? dataViewCategorical.values.length : 0;

            if (dataViewCategorical.categories && dataViewCategorical.categories.length > 0) {
                this.category = dataViewCategorical.categories[0];
                this.categoryIdentities = this.category.identity;
                this.categoryValues = this.category.values;
                this.categoryColumnRef = this.category.identityFields;
                this.categoryFormatString = valueFormatter.getFormatString(this.category.source, slicerXProps.formatString);
            }

            this.dataPoints = [];

            this.interactivityService = interactivityService;
            this.hasSelectionOverride = false;
        }

        public convert(): void {
            this.dataPoints = [];
            this.numberOfCategoriesSelectedInData = 0;
            // If category exists, we render labels using category values. If not, we render labels
            // using measure labels.
            if (this.categoryValues) {
                let objects = this.dataViewMetadata ? <any>this.dataViewMetadata.objects : undefined;

                let isInvertedSelectionMode = undefined;
                let numberOfScopeIds: number;
                if (objects && objects.general && objects.general.filter) {
                    if (!this.categoryColumnRef)
                        return;
                    let filter = <powerbi.data.SemanticFilter>objects.general.filter;
                    let scopeIds = powerbi.data.SQExprConverter.asScopeIdsContainer(filter, this.categoryColumnRef);
                    if (scopeIds) {
                        isInvertedSelectionMode = scopeIds.isNot;
                        numberOfScopeIds = scopeIds.scopeIds ? scopeIds.scopeIds.length : 0;
                    }
                    else {
                        isInvertedSelectionMode = false;
                    }
                }

                if (this.interactivityService) {
                    if (isInvertedSelectionMode === undefined) {
                        // The selection state is read from the Interactivity service in case of SelectAll or Clear when query doesn't update the visual
                        isInvertedSelectionMode = this.interactivityService.isSelectionModeInverted();
                    }
                    else {
                        this.interactivityService.setSelectionModeInverted(isInvertedSelectionMode);
                    }
                }

                let hasSelection: boolean = undefined;

                for (let idx = 0; idx < this.categoryValues.length; idx++) {
                    let selected = isCategoryColumnSelected(slicerXProps.selectedPropertyIdentifier, this.category, idx);
                    if (selected != null) {
                        hasSelection = selected;
                        break;
                    }
                }

                let dataViewCategorical = this.dataViewCategorical;
                let formatStringProp = slicerXProps.formatString;
                let value: number = -Infinity;
                let imageURL: string = '';

                for (let categoryIndex = 0, categoryCount = this.categoryValues.length; categoryIndex < categoryCount; categoryIndex++) {
                    let categoryIdentity = this.category.identity ? this.category.identity[categoryIndex] : null;
                    let categoryIsSelected = isCategoryColumnSelected(slicerXProps.selectedPropertyIdentifier, this.category, categoryIndex);

                    if (hasSelection != null) {
                        // If the visual is in InvertedSelectionMode, all the categories should be selected by default unless they are not selected
                        // If the visual is not in InvertedSelectionMode, we set all the categories to be false except the selected category                         
                        if (isInvertedSelectionMode) {
                            if (this.category.objects === null)
                                categoryIsSelected = undefined;

                            if (categoryIsSelected !== null) {
                                categoryIsSelected = hasSelection;
                            }
                            else if (categoryIsSelected === null)
                                categoryIsSelected = !hasSelection;
                        }
                        else {
                            if (categoryIsSelected === null) {
                                categoryIsSelected = !hasSelection;
                            }
                        }
                    }

                    if (categoryIsSelected)
                        this.numberOfCategoriesSelectedInData++;

                    let categoryValue = this.categoryValues[categoryIndex];
                    let categoryLabel = valueFormatter.format(categoryValue, this.categoryFormatString);

                    if (this.seriesCount > 0) {
                    
                        // Series are either measures in the multi-measure case, or the single series otherwise
                        for (let seriesIndex = 0; seriesIndex < this.seriesCount; seriesIndex++) {
                            let seriesData = dataViewCategorical.values[seriesIndex];
                            if (seriesData.values[categoryIndex] !== null) {
                                value = seriesData.values[categoryIndex];
                                if (seriesData.source.groupName && seriesData.source.groupName !== '') {
                                    imageURL = converterHelper.getFormattedLegendLabel(seriesData.source, dataViewCategorical.values, formatStringProp);
                                }
                            }
                        }
                    }

                    this.dataPoints.push({
                        identity: SelectionId.createWithId(categoryIdentity),
                        category: categoryLabel,
                        imageURL: imageURL,
                        value: value,
                        selected: categoryIsSelected,
                        selectable: true
                    });

                }
                if (numberOfScopeIds != null && numberOfScopeIds > this.numberOfCategoriesSelectedInData) {
                    this.hasSelectionOverride = true;
                }

            }
        }
    }
}