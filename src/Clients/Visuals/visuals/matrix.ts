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

    import TablixFormattingProperties = powerbi.visuals.controls.TablixFormattingPropertiesMatrix;
    import TablixUtils = controls.internal.TablixUtils;
    /**
     * Extension of the Matrix node for Matrix visual.
     */

    export interface MatrixVisualNode extends DataViewMatrixNode {
        /**
         * Index of the node in its parent's children collection.
         * 
         * Note: For size optimization, we could also look this item up in the parent's 
         * children collection, but we may need to pay the perf penalty.
         */
        index?: number;

        /**
         * Global index of the node as a leaf node.
         * If the node is not a leaf, the value is undefined.
         */
        leafIndex?: number;

        /**
         * Parent of the node.
         * Undefined for outermost nodes (children of the one root node).
         */
        parent?: MatrixVisualNode;

        /**
         * queryName of the node.
         * If the node is not a leaf, the value is undefined.
         */
        queryName?: string;
    }

    export interface MatrixCornerItem {
        metadata: DataViewMetadataColumn;
        isColumnHeaderLeaf: boolean;
        isRowHeaderLeaf: boolean;
    }

    export interface MatrixVisualBodyItem {
        textContent?: string;
        domContent?: JQuery;
        isSubtotal: boolean;
        isLeftMost: boolean;
    }
    
    /**
     * Interface for refreshing Matrix Data View.
     */
    export interface MatrixDataAdapter {
        update(dataViewMatrix?: DataViewMatrix, updateColumns?: boolean): void;
    }

    export interface IMatrixHierarchyNavigator extends controls.ITablixHierarchyNavigator, MatrixDataAdapter {
        getDataViewMatrix(): DataViewMatrix;
        getDepth(hierarchy: MatrixVisualNode[]): number;
        getLeafCount(hierarchy: MatrixVisualNode[]): number;
        getLeafAt(hierarchy: MatrixVisualNode[], index: number): any;
        getLeafIndex(item: MatrixVisualNode): number;
        getParent(item: MatrixVisualNode): MatrixVisualNode;
        getIndex(item: MatrixVisualNode): number;
        isLeaf(item: MatrixVisualNode): boolean;
        isRowHierarchyLeaf(item: any): boolean;
        isColumnHierarchyLeaf(item: any): boolean;
        isLastItem(item: MatrixVisualNode, items: MatrixVisualNode[]): boolean;
        getChildren(item: MatrixVisualNode): MatrixVisualNode[];
        getCount(items: MatrixVisualNode[]): number;
        getAt(items: MatrixVisualNode[], index: number): MatrixVisualNode;
        getLevel(item: MatrixVisualNode): number;
        getIntersection(rowItem: MatrixVisualNode, columnItem: MatrixVisualNode): MatrixVisualBodyItem;
        getCorner(rowLevel: number, columnLevel: number): MatrixCornerItem;
        headerItemEquals(item1: MatrixVisualNode, item2: MatrixVisualNode): boolean;
    }

    interface MatrixHierarchy extends DataViewHierarchy {
        leafNodes?: MatrixVisualNode[];
    }
    
    /**
     * Factory method used by unit tests.
     */
    export function createMatrixHierarchyNavigator(matrix: DataViewMatrix, formatter: ICustomValueColumnFormatter): IMatrixHierarchyNavigator {
        return new MatrixHierarchyNavigator(matrix, formatter);
    }

    class MatrixHierarchyNavigator implements IMatrixHierarchyNavigator {
        private matrix: DataViewMatrix;
        private rowHierarchy: MatrixHierarchy;
        private columnHierarchy: MatrixHierarchy;
        private formatter: ICustomValueColumnFormatter;

        constructor(matrix: DataViewMatrix, formatter: ICustomValueColumnFormatter) {
            this.matrix = matrix;
            this.rowHierarchy = MatrixHierarchyNavigator.wrapMatrixHierarchy(matrix.rows);
            this.columnHierarchy = MatrixHierarchyNavigator.wrapMatrixHierarchy(matrix.columns);
            this.formatter = formatter;

            this.update();
        }
        
        /**
         * Returns the data view matrix.
         */
        public getDataViewMatrix(): DataViewMatrix {
            return this.matrix;
        }
        
        /**
         * Returns the depth of a hierarchy.
         */
        public getDepth(hierarchy: MatrixVisualNode[]): number {
            let matrixHierarchy = this.getMatrixHierarchy(hierarchy);

            if (matrixHierarchy)
                return Math.max(matrixHierarchy.levels.length, 1);

            debug.assertFail('Hierarchy cannot be found');
            return 0;
        }
        
        /**
         * Returns the leaf count of a hierarchy.
         */
        public getLeafCount(hierarchy: MatrixVisualNode[]): number {
            let matrixHierarchy = this.getMatrixHierarchy(hierarchy);
            if (matrixHierarchy)
                return matrixHierarchy.leafNodes.length;

            debug.assertFail('Hierarchy cannot be found');
            return 0;
        }
        
        /**
         * Returns the leaf member of a hierarchy at a specified index.
         */
        public getLeafAt(hierarchy: MatrixVisualNode[], index: number): MatrixVisualNode {
            let matrixHierarchy = this.getMatrixHierarchy(hierarchy);
            if (matrixHierarchy)
                return matrixHierarchy.leafNodes[index];

            return null;
        }
        
        /**
         * Returns the leaf index of the visual node.
         */
        public getLeafIndex(item: MatrixVisualNode): number {
            debug.assertValue(item, 'item');

            return item.leafIndex;
        }
        
        /**
         * Returns the specified hierarchy member parent.
         */
        public getParent(item: MatrixVisualNode): MatrixVisualNode {
            debug.assertValue(item, 'item');

            // Return null for outermost nodes
            if (item.level === 0)
                return null;

            return item.parent;
        }
        
        /**
         * Returns the index of the hierarchy member relative to its parent.
         */
        public getIndex(item: MatrixVisualNode): number {
            debug.assertValue(item, 'item');

            return item.index;
        }
        
        /**
         * Checks whether a hierarchy member is a leaf.
         */
        public isLeaf(item: MatrixVisualNode): boolean {
            debug.assertValue(item, 'item');

            return !item.children || item.children.length === 0;
        }

        public isRowHierarchyLeaf(item: MatrixCornerItem): boolean {
            return true;
        }

        public isColumnHierarchyLeaf(item: MatrixCornerItem): boolean {
            return false;
        }
        
        /**
         * Checks whether a hierarchy member is the last item within its parent. 
         */
        public isLastItem(item: MatrixVisualNode, items: MatrixVisualNode[]): boolean {
            debug.assertValue(item, 'item');

            return items[items.length - 1] === item;
        }
        
        /**
         * Gets the children members of a hierarchy member.
         */
        public getChildren(item: MatrixVisualNode): MatrixVisualNode[] {
            debug.assertValue(item, 'item');

            return item.children;
        }
        
        /**
         * Gets the members count in a specified collection.
         */
        public getCount(items: MatrixVisualNode[]): number {
            debug.assertValue(items, 'items');

            return items.length;
        }
        
        /**
         * Gets the member at the specified index.
         */
        public getAt(items: MatrixVisualNode[], index: number): MatrixVisualNode {
            debug.assertValue(items, 'items');

            return items[index];
        }
        
        /**
         * Gets the hierarchy member level.
         */
        public getLevel(item: MatrixVisualNode): number {
            debug.assertValue(item, 'item');

            return item.level;
        }
        
        /**
         * Returns the intersection between a row and a column item.
         */
        public getIntersection(rowItem: MatrixVisualNode, columnItem: MatrixVisualNode): MatrixVisualBodyItem {
            debug.assertValue(rowItem, 'rowItem');
            debug.assertValue(columnItem, 'columnItem');
            let isSubtotalItem = rowItem.isSubtotal === true || columnItem.isSubtotal === true;

            if (!rowItem.values)
                return {
                    textContent: '',
                    isSubtotal: isSubtotalItem,
                    isLeftMost: columnItem.index === 0
                };

            let intersection = <DataViewMatrixNodeValue>(rowItem.values[columnItem.leafIndex]);
            if (!intersection)
                return {
                    isSubtotal: isSubtotalItem,
                    isLeftMost: columnItem.index === 0
                };

            let valueSource = this.matrix.valueSources[intersection.valueSourceIndex || 0];
            let formattedValue = this.formatter(intersection.value, valueSource, TablixUtils.TablixFormatStringProp);

            if (TablixUtils.isValidStatusGraphic(valueSource.kpi, formattedValue))
                return {
                    domContent: TablixUtils.createKpiDom(valueSource.kpi, intersection.value),
                    isSubtotal: isSubtotalItem,
                    isLeftMost: columnItem.index === 0
                };

            return {
                textContent: formattedValue,
                isSubtotal: isSubtotalItem,
                isLeftMost: columnItem.index === 0
            };
        }
        
        /**
         * Returns the corner cell between a row and a column level.
         */
        public getCorner(rowLevel: number, columnLevel: number): MatrixCornerItem {
            debug.assert(rowLevel >= 0, 'rowLevel');
            debug.assert(columnLevel >= 0, 'columnLevel');

            let columnLevels = this.columnHierarchy.levels;
            let rowLevels = this.rowHierarchy.levels;

            if (columnLevel === columnLevels.length - 1 || columnLevels.length === 0) {
                let levelSource = rowLevels[rowLevel];
                if (levelSource)
                    return {
                        metadata: levelSource.sources[0],
                        isColumnHeaderLeaf: true,
                        isRowHeaderLeaf: rowLevel === rowLevels.length - 1,
                    };
            }

            if (rowLevel === rowLevels.length - 1) {
                let levelSource = columnLevels[columnLevel];
                if (levelSource)
                    return {
                        metadata: levelSource.sources[0],
                        isColumnHeaderLeaf: false,
                        isRowHeaderLeaf: true,
                    };
            }

            return {
                metadata: null,
                isColumnHeaderLeaf: false,
                isRowHeaderLeaf: false,
            };
        }

        public headerItemEquals(item1: MatrixVisualNode, item2: MatrixVisualNode): boolean {
            return (item1 === item2);
        }

        public bodyCellItemEquals(item1: MatrixVisualBodyItem, item2: MatrixVisualBodyItem): boolean {
            return (item1 === item2);
        }

        public cornerCellItemEquals(item1: any, item2: any): boolean {
            return (item1 === item2);
        }

        public getMatrixColumnHierarchy(): MatrixHierarchy {
            return this.columnHierarchy;
        }

        public getMatrixRowHierarchy(): MatrixHierarchy {
            return this.rowHierarchy;
        }
        
        /**
         * Implementation for MatrixDataAdapter interface.
         */
        public update(dataViewMatrix?: DataViewMatrix, updateColumns: boolean = true): void {
            if (dataViewMatrix) {
                this.matrix = dataViewMatrix;
                this.rowHierarchy = MatrixHierarchyNavigator.wrapMatrixHierarchy(dataViewMatrix.rows);
                if (updateColumns)
                    this.columnHierarchy = MatrixHierarchyNavigator.wrapMatrixHierarchy(dataViewMatrix.columns);
            }
            this.updateHierarchy(this.rowHierarchy);
            if (updateColumns) {
                this.updateHierarchy(this.columnHierarchy);
                MatrixHierarchyNavigator.updateStaticColumnHeaders(this.columnHierarchy);
            }
        }

        private static wrapMatrixHierarchy(hierarchy: DataViewHierarchy): MatrixHierarchy {
            let matrixHierarchy = Prototype.inherit<MatrixHierarchy>(hierarchy);
            matrixHierarchy.leafNodes = [];

            return matrixHierarchy;
        }

        private updateHierarchy(hierarchy: MatrixHierarchy): void {
            if (hierarchy.leafNodes.length > 0)
                hierarchy.leafNodes.length = 0;

            if (hierarchy.root.children)
                this.updateRecursive(hierarchy, hierarchy.root.children, null, hierarchy.leafNodes);
        }

        private updateRecursive(hierarchy: MatrixHierarchy, nodes: MatrixVisualNode[], parent: MatrixVisualNode, cache: MatrixVisualNode[]): void {
            let level: DataViewHierarchyLevel;
            for (let i = 0, ilen = nodes.length; i < ilen; i++) {
                let node = nodes[i];
                if (parent)
                    node.parent = parent;

                if (!level)
                    level = hierarchy.levels[node.level];

                if (level) {
                    let source = level.sources[node.levelSourceIndex ? node.levelSourceIndex : 0];
                    let formatString = valueFormatter.getFormatString(source, TablixUtils.TablixFormatStringProp);
                    if (formatString)
                        node.name = this.formatter(node.value, source, TablixUtils.TablixFormatStringProp);
                    node.queryName = source.queryName;
                }

                node.index = i;
                if (node.children && node.children.length > 0) {
                    this.updateRecursive(hierarchy, node.children, node, cache);
                }
                else {
                    node.leafIndex = cache.length;
                    cache.push(node);
                }
            }
        }

        private static updateStaticColumnHeaders(columnHierarchy: MatrixHierarchy): void {
            let columnLeafNodes = columnHierarchy.leafNodes;
            if (columnLeafNodes && columnLeafNodes.length > 0) {
                let columnLeafSources = columnHierarchy.levels[columnLeafNodes[0].level].sources;

                for (let i = 0, ilen = columnLeafNodes.length; i < ilen; i++) {
                    let columnLeafNode = columnLeafNodes[i];

                    // Static leaf may need to get label from it's definition
                    if (!columnLeafNode.identity && columnLeafNode.value === undefined) {
                        // We make distincion between null and undefined. Null can be considered as legit value, undefined means we need to fall back to metadata
                        let source = columnLeafSources[columnLeafNode.levelSourceIndex ? columnLeafNode.levelSourceIndex : 0];
                        if (source)
                            columnLeafNode.name = source.displayName;
                    }
                }
            }
        }

        private getMatrixHierarchy(rootNodes: MatrixVisualNode[]): MatrixHierarchy {
            let rowHierarchyRootNodes = this.rowHierarchy.root.children;
            if (rowHierarchyRootNodes && rootNodes === rowHierarchyRootNodes)
                return this.rowHierarchy;

            let columnHierarchyRootNodes = this.columnHierarchy.root.children;
            if (columnHierarchyRootNodes && rootNodes === columnHierarchyRootNodes)
                return this.columnHierarchy;

            return null;
        }
    }

    export interface MatrixBinderOptions {
        onBindRowHeader?(item: MatrixVisualNode): void;
        totalLabel?: string;
        onColumnHeaderClick?(queryName: string): void;
    }

    export class MatrixBinder implements controls.ITablixBinder {

        private static headerClassName = "bi-tablix-header";
        private static numericCellClassName = "bi-table-cell-numeric";
        private static columnHeaderLeafClassName = "bi-tablix-column-header-leaf";
        private static rowHeaderLeafClassName = "bi-tablix-row-header-leaf";
        private static rowHeaderStaticLeafClassName = "bi-tablix-row-header-static-leaf";
        private static rowHeaderTopLevelStaticLeafClassName = "bi-tablix-row-header-toplevel-static-leaf";
        private static bodyCellClassName = "bi-matrix-body-cell";
        private static totalClassName = "total";
        private static nonBreakingSpace = '&nbsp;';

        private formattingProperties: TablixFormattingProperties;
        private hierarchyNavigator: IMatrixHierarchyNavigator;
        private options: MatrixBinderOptions;

        constructor(hierarchyNavigator: IMatrixHierarchyNavigator, options: MatrixBinderOptions) {

            // We pass the hierarchy navigator in here because it is the object that will
            // survive data changes and gets updated with the latest data view.
            this.hierarchyNavigator = hierarchyNavigator;
            this.options = options;
        }

        public onDataViewChanged(formattingProperties: TablixFormattingProperties): void {
            this.formattingProperties = formattingProperties;
        }

        public setTablixColumnSeparator(cell: controls.ITablixCell): void {
            if (this.formattingProperties.columns.showSeparators)
                cell.extension.setColumnSeparator(this.formattingProperties.columns.separatorColor, this.formattingProperties.columns.separatorWeight);
        }

        public setTablixRegionStyle(cell: controls.ITablixCell, fontColor: string, backgroundColor, outline: string, outlineWeight: number, outlineColor: string): void {
            if (fontColor !== "")
                cell.extension.setFontColor(fontColor);
            if (backgroundColor)
                cell.extension.setBackgroundColor(backgroundColor);

            let borderStyle = VisualBorderUtil.getBorderStyleWithWeight(outline, outlineWeight);
            let borderWeight = VisualBorderUtil.getBorderWidth(outline, outlineWeight);
            cell.extension.setOutline(borderStyle, outlineColor, borderWeight);
        }

        public onStartRenderingSession(): void {
        }

        public onEndRenderingSession(): void {
        }
        
        /**
         * Row Header.
         */
        public bindRowHeader(item: MatrixVisualNode, cell: controls.ITablixCell): void {
            let styleClasses: string;

            let isLeaf = this.hierarchyNavigator && this.hierarchyNavigator.isLeaf(item);
            if (isLeaf) {
                if (!item.identity) {
                    if (item.level === 0)
                        styleClasses = MatrixBinder.rowHeaderTopLevelStaticLeafClassName;
                    else
                        styleClasses = MatrixBinder.rowHeaderStaticLeafClassName;
                }
                else {
                    styleClasses = MatrixBinder.rowHeaderLeafClassName;
                }
            }
            else
                styleClasses = MatrixBinder.headerClassName;

            if (item.isSubtotal)
                styleClasses += ' ' + MatrixBinder.totalClassName;

            cell.extension.setContainerStyle(styleClasses);

            this.bindHeader(item, cell, this.getRowHeaderMetadata(item));

            if (this.options.onBindRowHeader)
                this.options.onBindRowHeader(item);

            if (this.formattingProperties) {
                let fontColor = item.isSubtotal ? this.formattingProperties.totals.fontColor : this.formattingProperties.rows.fontColor;
                let backgroundColor = item.isSubtotal ? this.formattingProperties.totals.backgroundColor : this.formattingProperties.rows.backgroundColor;
                let outlineStyle = item.isSubtotal ? this.formattingProperties.totals.outline : this.formattingProperties.rows.outline;

                this.setTablixRegionStyle(cell, fontColor, backgroundColor, outlineStyle, this.formattingProperties.general.outlineWeight, this.formattingProperties.general.outlineColor);

                if (this.formattingProperties.rows.showSeparators)
                    cell.extension.setRowSeparator();

                //set leading spaces for totals
                if (item.isSubtotal)
                    cell.extension.setLeadingSpace(this.formattingProperties.totals.leadingSpace);
            }
        }

        public unbindRowHeader(item: any, cell: controls.ITablixCell): void {
            cell.extension.clearContainerStyle();
            controls.HTMLElementUtils.clearChildren(cell.extension.contentHost);
        }
        
        /**
         * Column Header.
         */
        public bindColumnHeader(item: MatrixVisualNode, cell: controls.ITablixCell): void {
            let styleClasses: string;
            let overwriteTotalLabel = false;

            let isLeaf = this.hierarchyNavigator && this.hierarchyNavigator.isLeaf(item);
            if (isLeaf) {
                styleClasses = MatrixBinder.columnHeaderLeafClassName;

                let sortableHeaderColumnMetadata = this.getSortableHeaderColumnMetadata(item);
                if (sortableHeaderColumnMetadata) {
                    this.registerColumnHeaderClickHandler(sortableHeaderColumnMetadata, cell);
                }

                // Overwrite only if the there are subtotal siblings (like in the multimeasure case), which means ALL siblings are subtotals.
                if (item.isSubtotal && item.parent && item.parent.children.length > 1 && (<MatrixVisualNode>item.parent.children[0]).isSubtotal)
                    overwriteTotalLabel = true;
            }
            else {
                styleClasses = MatrixBinder.headerClassName;
            }

            if (item.isSubtotal)
                styleClasses += ' ' + MatrixBinder.totalClassName;

            styleClasses += ' ' + MatrixBinder.numericCellClassName;
            cell.extension.setContainerStyle(styleClasses);

            if (this.formattingProperties) {
                this.setTablixRegionStyle(cell, this.formattingProperties.header.fontColor, this.formattingProperties.header.backgroundColor, this.formattingProperties.header.outline, this.formattingProperties.general.outlineWeight, this.formattingProperties.general.outlineColor);
                this.setTablixColumnSeparator(cell);
            }

            cell.extension.disableDragResize();
            this.bindHeader(item, cell, this.getColumnHeaderMetadata(item), overwriteTotalLabel);
        }

        public unbindColumnHeader(item: MatrixVisualNode, cell: controls.ITablixCell): void {
            cell.extension.clearContainerStyle();
            cell.extension.contentHost.textContent = '';

            let sortableHeaderColumnMetadata = this.getSortableHeaderColumnMetadata(item);
            if (sortableHeaderColumnMetadata) {
                this.unregisterColumnHeaderClickHandler(cell);
            }
        }
        
        /**
         * Body Cell.
         */
        public bindBodyCell(item: MatrixVisualBodyItem, cell: controls.ITablixCell): void {
            let styleClasses = MatrixBinder.bodyCellClassName;

            if (item.isSubtotal)
                styleClasses += ' ' + MatrixBinder.totalClassName;

            cell.extension.setContainerStyle(styleClasses);

            if (item.textContent)
                cell.extension.contentHost.textContent = item.textContent;
            else if (!_.isEmpty(item.domContent))
                $(cell.extension.contentHost).append(item.domContent);

            if (this.formattingProperties) {
                let outlineStyle = item.isSubtotal ? this.formattingProperties.totals.outline : item.isLeftMost ? this.formattingProperties.values.outline : 'None';
                let fontColor = item.isSubtotal ? this.formattingProperties.totals.fontColor : this.formattingProperties.values.fontColor;
                let backgroundColor = item.isSubtotal ? this.formattingProperties.totals.backgroundColor : this.formattingProperties.values.backgroundColor;

                this.setTablixRegionStyle(cell, fontColor, backgroundColor, outlineStyle, this.formattingProperties.general.outlineWeight, this.formattingProperties.general.outlineColor);
                //set leading spaces for totals
                if (item.isSubtotal)
                    cell.extension.setLeadingSpace(this.formattingProperties.totals.leadingSpace);

                if (this.formattingProperties.rows.showSeparators)
                    cell.extension.setRowSeparator();

                this.setTablixColumnSeparator(cell);
            }
        }

        public unbindBodyCell(item: MatrixVisualBodyItem, cell: controls.ITablixCell): void {
            cell.extension.clearContainerStyle();
            cell.extension.contentHost.textContent = '';
        }

        private registerColumnHeaderClickHandler(columnMetadata: DataViewMetadataColumn, cell: controls.ITablixCell) {
            if (this.options.onColumnHeaderClick) {
                let handler = (e: MouseEvent) => {
                    this.options.onColumnHeaderClick(columnMetadata.queryName ? columnMetadata.queryName : columnMetadata.displayName);
                };
                cell.extension.registerClickHandler(handler);
            }
        }

        private unregisterColumnHeaderClickHandler(cell: controls.ITablixCell) {
            if (this.options.onColumnHeaderClick) {
                cell.extension.unregisterClickHandler();
            }
        }
        
        /**
         * Corner Cell.
         */
        public bindCornerCell(item: MatrixCornerItem, cell: controls.ITablixCell): void {
            let styleClasses: string;

            if (item.isColumnHeaderLeaf) {
                styleClasses = MatrixBinder.columnHeaderLeafClassName;
                let cornerHeaderMetadata = this.getSortableCornerColumnMetadata(item);
                if (cornerHeaderMetadata)
                    this.registerColumnHeaderClickHandler(cornerHeaderMetadata, cell);
            }

            if (item.isRowHeaderLeaf) {
                if (styleClasses)
                    styleClasses += ' ';
                else
                    styleClasses = '';

                styleClasses += MatrixBinder.rowHeaderLeafClassName;
            }

            if (styleClasses)
                cell.extension.setContainerStyle(styleClasses);
            else
                cell.extension.setContainerStyle(MatrixBinder.headerClassName);

            cell.extension.disableDragResize();
            cell.extension.contentHost.textContent = item.metadata ? item.metadata.displayName : '';

            if (this.formattingProperties) {
                this.setTablixRegionStyle(cell, this.formattingProperties.header.fontColor, this.formattingProperties.header.backgroundColor, this.formattingProperties.header.outline, this.formattingProperties.general.outlineWeight, this.formattingProperties.general.outlineColor);
            }
        }

        public unbindCornerCell(item: MatrixCornerItem, cell: controls.ITablixCell): void {
            cell.extension.clearContainerStyle();
            cell.extension.contentHost.textContent = '';

            if (item.isColumnHeaderLeaf) {
                this.unregisterColumnHeaderClickHandler(cell);
            }
        }

        public bindEmptySpaceHeaderCell(cell: controls.ITablixCell): void {
        }

        public unbindEmptySpaceHeaderCell(cell: controls.ITablixCell): void {
        }

        public bindEmptySpaceFooterCell(cell: controls.ITablixCell): void {
        }

        public unbindEmptySpaceFooterCell(cell: controls.ITablixCell): void {
        }
        
        /**
         * Measurement Helper.
         */
        public getHeaderLabel(item: MatrixVisualNode): string {
            return MatrixBinder.getNodeLabel(item);
        }

        public getCellContent(item: MatrixVisualBodyItem): string {
            return item.textContent || '';
        }

        public hasRowGroups(): boolean {
            // Figure out whether we have a static row header, i.e., not row groups
            let dataView = this.hierarchyNavigator.getDataViewMatrix();

            if (!dataView || !dataView.rows || !dataView.rows.levels || dataView.rows.levels.length === 0)
                return false;

            return true;
        }

        private static getNodeLabel(node: MatrixVisualNode): string {
            // Return formatted value
            if (node.name)
                return node.name;

            // Return unformatted value (fallback case)
            if (node.value != null)
                return node.value.toString();

            return '';
        }

        private bindHeader(item: MatrixVisualNode, cell: controls.ITablixCell, metadata: DataViewMetadataColumn, overwriteSubtotalLabel?: boolean): void {
            if (item.isSubtotal && !overwriteSubtotalLabel) {
                cell.extension.contentHost.textContent = this.options.totalLabel;
                return;
            }

            let value = MatrixBinder.getNodeLabel(item);
            if (!value) {
                // just to maintain the height of the row in case all realized cells are nulls
                cell.extension.contentHost.innerHTML = MatrixBinder.nonBreakingSpace;
                return;
            }

            if (metadata && UrlHelper.isValidUrl(metadata, value)) {
                TablixUtils.appendATagToBodyCell(item.value, cell);
            } else if (metadata && UrlHelper.isValidImage(metadata, value)) {
                TablixUtils.appendImgTagToBodyCell(item.value, cell);
            }
            else
                cell.extension.contentHost.textContent = value;
        }
       
        /**
         * Returns the column metadata of the column that needs to be sorted for the specified matrix corner node.
         * 
         * @return Column metadata or null if the specified corner node does not represent a sortable header.
         */
        private getSortableCornerColumnMetadata(item: MatrixCornerItem): DataViewMetadataColumn {
            if (!item.isColumnHeaderLeaf)
                return null;

            return item.metadata;
        }

        private getRowHeaderMetadata(item: MatrixVisualNode): DataViewMetadataColumn {
            if (!this.hierarchyNavigator || !item)
                return;

            let dataView = this.hierarchyNavigator.getDataViewMatrix();

            if (!dataView || !dataView.rows)
                return;

            return this.getHierarchyMetadata(dataView.rows, item.level);
        }

        private getColumnHeaderMetadata(item: MatrixVisualNode): DataViewMetadataColumn {
            if (!this.hierarchyNavigator || !item)
                return;

            let dataView = this.hierarchyNavigator.getDataViewMatrix();
            if (!dataView || !dataView.columns)
                return;

            return this.getHierarchyMetadata(dataView.columns, item.level);
        }

        private getHierarchyMetadata(hierarchy: DataViewHierarchy, level: number): DataViewMetadataColumn {
            if (!hierarchy || !hierarchy.levels || hierarchy.levels.length < level)
                return;

            let levelInfo = hierarchy.levels[level];
            if (!levelInfo || !levelInfo.sources || levelInfo.sources.length === 0)
                return;

            // This assumes the source will always be the first item in the array of sources.
            return levelInfo.sources[0];
        }
        
        /**
         * Returns the column metadata of the column that needs to be sorted for the specified header node.
         * 
         * @return Column metadata or null if the specified header node does not represent a sortable header.
         */
        private getSortableHeaderColumnMetadata(item: MatrixVisualNode): DataViewMetadataColumn {

            let dataView = this.hierarchyNavigator.getDataViewMatrix();

            // If there are no row groups, sorting is not supported (as it does not make sense).
            if (!dataView.rows || !dataView.rows.levels || dataView.rows.levels.length === 0)
                return null;

            // Note that the measures establish a level as well, so need to subtract 1
            let columnGroupCount = dataView.columns ? dataView.columns.levels.length - 1 : 0;

            let valueIndex: number = -1;
            if (columnGroupCount === 0) {
                // Matrices without column groups, support sorting on all columns (which are then measure columns).
                valueIndex = item.levelSourceIndex;
            }
            else if (item.isSubtotal) {
                // Matrices with column groups support sorting only on the column grand total.
                let isMultiMeasure: boolean = dataView.valueSources && dataView.valueSources.length > 1;

                if (isMultiMeasure) {
                    // In the multi-measure case we need to check if the parent's level is 0 in order
                    // to determine whether this is the column grand total.  The cells are layed out such
                    // that the clickable cells are at the innermost level, but the parent for the column
                    // grand total will have level 0.
                    if (item.parent && item.parent.level === 0)
                        valueIndex = item.levelSourceIndex;
                }
                else {
                    // In the single-measure case we can directly check the level of the subtotal to
                    // detect the column grand total (at level 0).
                    if (item.level === 0)
                        valueIndex = item.levelSourceIndex;
                }
            }

            if (valueIndex !== -1) {
                // NOTE: if the valueIndex is undefined it implicitly means that it is 0 based on the 
                //       visual node contract
                valueIndex = valueIndex ? valueIndex : 0;
                return dataView.valueSources[valueIndex];
            }

            return null;
        }
    }

    export interface MatrixConstructorOptions {
        isFormattingPropertiesEnabled?: boolean;
        isTouchEnabled?: boolean;
    }

    export class Matrix implements IVisual {
        private static preferredLoadMoreThreshold: number = 0.8;
        
        /**
         * Note: Public only for testing.
         */
        public static TotalLabel = 'TableTotalLabel';

        private element: JQuery;
        private currentViewport: IViewport;
        private style: IVisualStyle;
        private dataView: DataView;
        private formatter: ICustomValueColumnFormatter;
        private isInteractive: boolean;
        private isTouchEnabled: boolean;
        private hostServices: IVisualHostServices;
        private hierarchyNavigator: IMatrixHierarchyNavigator;
        private waitingForData: boolean;
        private tablixControl: controls.TablixControl;
        private lastAllowHeaderResize: boolean;
        private waitingForSort: boolean;
        private columnWidthManager: controls.TablixColumnWidthManager;
        private isFormattingPropertiesEnabled: boolean;

        constructor(options?: MatrixConstructorOptions) {
            if (options) {
                this.isFormattingPropertiesEnabled = options.isFormattingPropertiesEnabled;
                this.isTouchEnabled = options.isTouchEnabled;
            }
        }

        public static customizeQuery(options: CustomizeQueryOptions): void {
            let dataViewMapping = options.dataViewMappings[0];
            if (!dataViewMapping || !dataViewMapping.matrix || !dataViewMapping.metadata)
                return;

            let dataViewMatrix: data.CompiledDataViewMatrixMapping = <data.CompiledDataViewMatrixMapping>dataViewMapping.matrix;

            //If Columns Hierarchy is not empty, set Window DataReduction Count to 100
            if (!_.isEmpty(dataViewMatrix.columns.for.in.items)) {
                dataViewMatrix.rows.dataReductionAlgorithm.window.count = 100;
            }
            let objects: controls.TablixFormattingPropertiesMatrix = <controls.TablixFormattingPropertiesMatrix>dataViewMapping.metadata.objects;
            (<data.CompiledDataViewRoleForMappingWithReduction>dataViewMatrix.rows).for.in.subtotalType = TablixUtils.shouldShowRowSubtotals(objects) ? data.CompiledSubtotalType.After : data.CompiledSubtotalType.None;
            dataViewMatrix.columns.for.in.subtotalType = TablixUtils.shouldShowColumnSubtotals(objects) ? data.CompiledSubtotalType.After : data.CompiledSubtotalType.None;
        }

        public static getSortableRoles(): string[] {
            return ['Rows', 'Values'];
        }

        public init(options: VisualInitOptions): void {
            this.element = options.element;
            this.style = options.style;
            this.updateViewport(options.viewport);
            this.formatter = valueFormatter.formatValueColumn;
            this.isInteractive = options.interactivity && options.interactivity.selection != null;
            this.hostServices = options.host;

            this.waitingForData = false;
            this.lastAllowHeaderResize = true;
            this.waitingForSort = false;
        }

        public static converter(dataView: DataView, isFormattingPropertiesEnabled: boolean): TablixFormattingProperties {
            debug.assertValue(dataView, 'dataView');
            let formattingProperties: TablixFormattingProperties;

            if (isFormattingPropertiesEnabled) {
                formattingProperties = TablixUtils.getMatrixFormattingProperties(dataView);
            }

            return formattingProperties;
        }

        public onResizing(finalViewport: IViewport): void {
            this.updateViewport(finalViewport);
        }

        /*
        Public for testing
        */
        public getColumnWidthManager(): controls.TablixColumnWidthManager {
            return this.columnWidthManager;
        }

        public onDataChanged(options: VisualDataChangedOptions): void {
            debug.assertValue(options, 'options');

            // To avoid OnDataChanged being called every time resize occurs or the auto-size property switch is flipped.
            if (this.columnWidthManager && this.columnWidthManager.suppressOnDataChangedNotification) {
                // Reset flag for cases when cross-filter/cross-higlight happens right after. We do need onDataChanged call to go through
                this.columnWidthManager.suppressOnDataChangedNotification = false;
                return;
            }
            let previousDataView = this.dataView;

            if (options.dataViews && options.dataViews.length > 0) {
                this.dataView = options.dataViews[0];
                let formattingProperties = Matrix.converter(this.dataView, this.isFormattingPropertiesEnabled);
                let textSize = formattingProperties ? formattingProperties.general.textSize : TablixUtils.getTextSize(this.dataView.metadata.objects);

                if (options.operationKind === VisualDataChangeOperationKind.Append) {
                    let rootChanged = previousDataView.matrix.rows.root !== this.dataView.matrix.rows.root;

                    this.hierarchyNavigator.update(this.dataView.matrix, rootChanged);
                    //If Root for Rows or Columns has changed by the DataViewTransform (e.g. when having reorders in values)
                    if (rootChanged)
                        this.tablixControl.updateModels(/*resetScrollOffsets*/false, this.dataView.matrix.rows.root.children, this.dataView.matrix.columns.root.children);

                    this.refreshControl(/*clear*/false);
                } else {
                    this.createOrUpdateHierarchyNavigator();
                    this.createColumnWidthManager();
                    this.createTablixControl(textSize);
                    let binder = <MatrixBinder>this.tablixControl.getBinder();
                    binder.onDataViewChanged(formattingProperties);
                    this.populateColumnWidths();
                    this.updateInternal(this.dataView, textSize, previousDataView);
                }
            }

            this.waitingForData = false;
            this.waitingForSort = false;
        }

        private populateColumnWidths(): void {
            if (this.columnWidthManager) {
                this.columnWidthManager.deserializeTablixColumnWidths();
                if (this.columnWidthManager.persistColumnWidthsOnHost())
                    this.persistColumnWidths(this.columnWidthManager.getVisualObjectInstancesToPersist());
            }
        }

        public columnWidthChanged(index: number, width: number): void {
            this.columnWidthManager.columnWidthChanged(index, width);
            this.persistColumnWidths(this.columnWidthManager.getVisualObjectInstancesToPersist());
        }

        private persistColumnWidths(objectInstances: VisualObjectInstancesToPersist): void {
            this.hostServices.persistProperties(objectInstances);
        }

        private updateViewport(newViewport: IViewport) {
            this.currentViewport = newViewport;

            if (this.tablixControl) {
                this.tablixControl.viewport = this.currentViewport;
                this.verifyHeaderResize();

                this.refreshControl(/*clear*/false);
            }
        }

        private refreshControl(clear: boolean) {
            if (visibilityHelper.partiallyVisible(this.element) || this.getLayoutKind() === controls.TablixLayoutKind.DashboardTile) {
                this.tablixControl.refresh(clear);
            }
        }

        private getLayoutKind() {
            return this.isInteractive ? controls.TablixLayoutKind.Canvas : controls.TablixLayoutKind.DashboardTile;
        }

        private createOrUpdateHierarchyNavigator(): void {
            if (!this.tablixControl) {
                let matrixNavigator = createMatrixHierarchyNavigator(this.dataView.matrix, this.formatter);
                this.hierarchyNavigator = matrixNavigator;
            }
            else {
                this.hierarchyNavigator.update(this.dataView.matrix);
            }
        }

        private createTablixControl(textSize: number): void {
            if (!this.tablixControl) {
                // Create the control
                this.tablixControl = this.createControl(this.hierarchyNavigator, textSize);
            }
        }

        private createColumnWidthManager(): void {
            let columnHierarchy: MatrixHierarchy = (<MatrixHierarchyNavigator>this.hierarchyNavigator).getMatrixColumnHierarchy();
            if (!this.columnWidthManager) {
                this.columnWidthManager = new controls.TablixColumnWidthManager(this.dataView, true /* isMatrix */, columnHierarchy.leafNodes);
                this.columnWidthManager.columnWidthResizeCallback = (i, w) => this.columnWidthChanged(i, w);
            }
            else {
                this.columnWidthManager.updateDataView(this.dataView, columnHierarchy.leafNodes);
            }
        }

        private createControl(matrixNavigator: IMatrixHierarchyNavigator, textSize: number): controls.TablixControl {
            let layoutKind = this.getLayoutKind();

            let matrixBinderOptions: MatrixBinderOptions = {
                onBindRowHeader: (item: MatrixVisualNode) => { this.onBindRowHeader(item); },
                totalLabel: this.hostServices.getLocalizedString(Matrix.TotalLabel),
                onColumnHeaderClick: (queryName: string) => this.onColumnHeaderClick(queryName),
            };
            let matrixBinder = new MatrixBinder(this.hierarchyNavigator, matrixBinderOptions);

            let layoutManager: controls.internal.TablixLayoutManager = layoutKind === controls.TablixLayoutKind.DashboardTile
                ? controls.internal.DashboardTablixLayoutManager.createLayoutManager(matrixBinder)
                : controls.internal.CanvasTablixLayoutManager.createLayoutManager(matrixBinder, this.columnWidthManager);

            let tablixContainer = document.createElement('div');
            this.element.append(tablixContainer);

            let tablixOptions: controls.TablixOptions = {
                interactive: this.isInteractive,
                enableTouchSupport: this.isTouchEnabled,
                fontSize: TablixUtils.getTextSizeInPx(textSize),
            };

            return new controls.TablixControl(matrixNavigator, layoutManager, matrixBinder, tablixContainer, tablixOptions);
        }

        private updateInternal(dataView: DataView, textSize: number, previousDataView: DataView) {
            if (this.getLayoutKind() === controls.TablixLayoutKind.DashboardTile) {
                this.tablixControl.layoutManager.adjustContentSize(UrlHelper.hasImageColumn(dataView));
            }

            this.tablixControl.fontSize = TablixUtils.getTextSizeInPx(textSize);
            this.verifyHeaderResize();

            // Update models before the viewport to make sure column widths are computed correctly
            this.tablixControl.updateModels(/*resetScrollOffsets*/true, dataView.matrix.rows.root.children, dataView.matrix.columns.root.children);
            this.tablixControl.viewport = this.currentViewport;
            let shouldClearControl = this.shouldClearControl(previousDataView, dataView);

            // We need the layout for the DIV to be done so that the control can measure items correctly.
            setTimeout(() => {
                // Render
                this.refreshControl(shouldClearControl);
                this.columnWidthManager.persistAllColumnWidths(this.tablixControl.layoutManager.columnWidthsToPersist);
                if (this.columnWidthManager.persistColumnWidthsOnHost())
                    this.persistColumnWidths(this.columnWidthManager.getVisualObjectInstancesToPersist());
            }, 0);
        }

        private shouldClearControl(previousDataView: DataView, newDataView: DataView) {
            if (!this.waitingForSort || !previousDataView || !newDataView)
                return true;

            return !DataViewAnalysis.isMetadataEquivalent(previousDataView.metadata, newDataView.metadata);
        }

        private onBindRowHeader(item: MatrixVisualNode): void {
            if (this.needsMoreData(item)) {
                this.hostServices.loadMoreData();
                this.waitingForData = true;
            }
        }

        private onColumnHeaderClick(queryName: string) {
            let sortDescriptors: SortableFieldDescriptor[] = [{
                queryName: queryName,
            }];
            let args: CustomSortEventArgs = {
                sortDescriptors: sortDescriptors
            };
            this.waitingForSort = true;
            this.hostServices.onCustomSort(args);
        }
        
        /**
         * Note: Public for testability.
         */
        public needsMoreData(item: MatrixVisualNode): boolean {
            if (this.waitingForData || !this.hierarchyNavigator.isLeaf(item) || !this.dataView.metadata || !this.dataView.metadata.segment)
                return false;

            let leafCount = this.tablixControl.rowDimension.getItemsCount();
            let loadMoreThreshold = leafCount * Matrix.preferredLoadMoreThreshold;

            return this.hierarchyNavigator.getLeafIndex(item) >= loadMoreThreshold;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let enumeration = new ObjectEnumerationBuilder();

            if (this.dataView) {
                TablixUtils.setEnumeration(options, enumeration, this.dataView, this.isFormattingPropertiesEnabled, controls.TablixType.Matrix);
            }

            return enumeration.complete();
        }

        private shouldAllowHeaderResize(): boolean {
            return this.hostServices.getViewMode() === ViewMode.Edit;
        }

        private verifyHeaderResize() {
            let currentAllowHeaderResize = this.shouldAllowHeaderResize();
            if (currentAllowHeaderResize !== this.lastAllowHeaderResize) {
                this.lastAllowHeaderResize = currentAllowHeaderResize;
                this.tablixControl.layoutManager.setAllowHeaderResize(currentAllowHeaderResize);
            }
        }
    }
}