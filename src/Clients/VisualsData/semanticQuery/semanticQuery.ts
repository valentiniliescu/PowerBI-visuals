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

module powerbi.data {
    import ArrayExtensions = jsCommon.ArrayExtensions;
    import ArrayNamedItems = jsCommon.ArrayNamedItems;

    export interface NamedSQExpr {
        name: string;
        expr: SQExpr;
    }

    export interface SQFilter {
        target?: SQExpr[];
        condition: SQExpr;
    }

    /** Represents an entity reference in SemanticQuery from. */
    export interface SQFromEntitySource {
        entity: string;
        schema: string;
    }

    /** Represents a sort over an expression. */
    export interface SQSortDefinition {
        expr: SQExpr;
        direction: SortDirection;
    }

    export interface QueryFromEnsureEntityResult {
        name: string;
        new?: boolean;
    }

    export interface SQSourceRenames {
        [from: string]: string;
    }

    /**
     * Represents a semantic query that is:
     * 1) Round-trippable with a JSON QueryDefinition.
     * 2) Immutable
     * 3) Long-lived and does not have strong references to a conceptual model (only names).
     */
    export class SemanticQuery {
        private static empty: SemanticQuery;
        private fromValue: SQFrom;
        private whereItems: SQFilter[];
        private orderByItems: SQSortDefinition[];
        private selectItems: NamedSQExpr[];

        constructor(from, where, orderBy, select: NamedSQExpr[]) {
            debug.assertValue(from, 'from');
            debug.assertValue(select, 'select');

            this.fromValue = from;
            this.whereItems = where;
            this.orderByItems = orderBy;
            this.selectItems = select;
        }

        public static create(): SemanticQuery {
            if (!SemanticQuery.empty)
                SemanticQuery.empty = new SemanticQuery(new SQFrom(), null, null, []);

            return SemanticQuery.empty;
        }

        private static createWithTrimmedFrom(
            from: SQFrom,
            where: SQFilter[],
            orderBy: SQSortDefinition[],
            select: NamedSQExpr[]): SemanticQuery {

            let unreferencedKeyFinder = new UnreferencedKeyFinder(from.keys());

            // Where
            if (where) {
                for (let i = 0, len = where.length; i < len; i++) {
                    let filter = where[i];

                    filter.condition.accept(unreferencedKeyFinder);

                    let filterTarget = filter.target;
                    if (filterTarget) {
                        for (let j = 0, jlen = filterTarget.length; j < jlen; j++)
                            if (filterTarget[j])
                                filterTarget[j].accept(unreferencedKeyFinder);
                    }
                }
            }

            // OrderBy
            if (orderBy) {
                for (let i = 0, len = orderBy.length; i < len; i++)
                    orderBy[i].expr.accept(unreferencedKeyFinder);
            }

            // Select
            for (let i = 0, len = select.length; i < len; i++)
                select[i].expr.accept(unreferencedKeyFinder);

            let unreferencedKeys = unreferencedKeyFinder.result();
            for (let i = 0, len = unreferencedKeys.length; i < len; i++)
                from.remove(unreferencedKeys[i]);

            return new SemanticQuery(from, where, orderBy, select);
        }

        public from(): SQFrom {
            return this.fromValue.clone();
        }

        /** Returns a query equivalent to this, with the specified selected items. */
        select(values: NamedSQExpr[]): SemanticQuery;
        /** Gets the items being selected in this query. */
        select(): ArrayNamedItems<NamedSQExpr>;
        public select(values?: NamedSQExpr[]): any {
            if (arguments.length === 0)
                return this.getSelect();

            return this.setSelect(values);
        }

        private getSelect(): ArrayNamedItems<NamedSQExpr> {
            return ArrayExtensions.extendWithName<NamedSQExpr>(_.map(this.selectItems, s => {
                return {
                    name: s.name,
                    expr: s.expr,
                };
            }));
        }

        private setSelect(values: NamedSQExpr[]): SemanticQuery {
            let selectItems: NamedSQExpr[] = [],
                from = this.fromValue.clone();

            for (let i = 0, len = values.length; i < len; i++) {
                let value = values[i];
                selectItems.push({
                    name: value.name,
                    expr: SQExprRewriterWithSourceRenames.rewrite(value.expr, from)
                });
            }

            return SemanticQuery.createWithTrimmedFrom(from, this.whereItems, this.orderByItems, selectItems);
        }

        /** Removes the given expression from the select. */
        public removeSelect(expr: SQExpr): SemanticQuery {
            debug.assertValue(expr, 'expr');

            let originalItems = this.selectItems,
                selectItems: NamedSQExpr[] = [];
            for (let i = 0, len = originalItems.length; i < len; i++) {
                let originalExpr = originalItems[i];
                if (SQExpr.equals(originalExpr.expr, expr))
                    continue;

                selectItems.push(originalExpr);
            }

            return SemanticQuery.createWithTrimmedFrom(this.fromValue.clone(), this.whereItems, this.orderByItems, selectItems);
        }

        /** Removes the given expression from order by. */
        public removeOrderBy(expr: SQExpr): SemanticQuery {
            let sorts = this.orderBy();
            for (let i = sorts.length - 1; i >= 0; i--) {
                if (SQExpr.equals(sorts[i].expr, expr))
                    sorts.splice(i, 1);
            }

            return SemanticQuery.createWithTrimmedFrom(this.fromValue.clone(), this.whereItems, sorts, this.selectItems);
        }

        public selectNameOf(expr: SQExpr): string {
            let index = SQExprUtils.indexOfExpr(_.map(this.selectItems, s => s.expr), expr);
            if (index >= 0)
                return this.selectItems[index].name;
        }

        public setSelectAt(index: number, expr: SQExpr): SemanticQuery {
            debug.assertValue(expr, 'expr');

            if (index >= this.selectItems.length)
                return;

            let select = this.select(),
                from = this.fromValue.clone(),
                originalName = select[index].name;
            select[index] = {
                name: originalName,
                expr: SQExprRewriterWithSourceRenames.rewrite(expr, from)
            };

            return SemanticQuery.createWithTrimmedFrom(from, this.whereItems, this.orderByItems, select);
        }

        /** Adds a the expression to the select clause. */
        public addSelect(expr: SQExpr): SemanticQuery {
            debug.assertValue(expr, 'expr');

            let selectItems = this.select(),
                from = this.fromValue.clone();
            selectItems.push({
                name: SQExprUtils.uniqueName(selectItems, expr),
                expr: SQExprRewriterWithSourceRenames.rewrite(expr, from)
            });

            return SemanticQuery.createWithTrimmedFrom(from, this.whereItems, this.orderByItems, selectItems);
        }

        /** Gets or sets the sorting for this query. */
        orderBy(values: SQSortDefinition[]): SemanticQuery;
        orderBy(): SQSortDefinition[];

        public orderBy(values?: SQSortDefinition[]): any {
            if (arguments.length === 0)
                return this.getOrderBy();

            return this.setOrderBy(values);
        }

        private getOrderBy(): SQSortDefinition[] {
            let result: SQSortDefinition[] = [];

            let orderBy = this.orderByItems;
            if (orderBy) {
                for (let i = 0, len = orderBy.length; i < len; i++) {
                    let clause = orderBy[i];

                    result.push({
                        expr: clause.expr,
                        direction: clause.direction,
                    });
                }
            }

            return result;
        }

        private setOrderBy(values: SQSortDefinition[]): SemanticQuery {
            debug.assertValue(values, 'values');

            let updatedOrderBy: SQSortDefinition[] = [],
                from = this.fromValue.clone();
            for (let i = 0, len = values.length; i < len; i++) {
                let clause = values[i];
                updatedOrderBy.push({
                    expr: SQExprRewriterWithSourceRenames.rewrite(clause.expr, from),
                    direction: clause.direction,
                });
            }

            return SemanticQuery.createWithTrimmedFrom(from, this.whereItems, updatedOrderBy, this.selectItems);
        }

        /** Gets or sets the filters for this query. */
        where(values: SQFilter[]): SemanticQuery;
        where(): SQFilter[];

        public where(values?: SQFilter[]): any {
            if (arguments.length === 0)
                return this.getWhere();

            return this.setWhere(values);
        }

        private getWhere(): SQFilter[] {
            let result: SQFilter[] = [];

            let whereItems = this.whereItems;
            if (whereItems) {
                for (let i = 0, len = whereItems.length; i < len; i++)
                    result.push(whereItems[i]);
            }

            return result;
        }

        private setWhere(values: SQFilter[]): SemanticQuery {
            debug.assertValue(values, 'values');

            let updatedWhere: SQFilter[] = [],
                from = this.fromValue.clone();
            for (let i = 0, len = values.length; i < len; i++) {
                let filter = values[i];
                let updatedFilter: SQFilter = {
                    condition: SQExprRewriterWithSourceRenames.rewrite(filter.condition, from),
                };

                let filterTarget = filter.target;
                if (filterTarget) {
                    updatedFilter.target = [];
                    for (let j = 0, jlen = filterTarget.length; j < jlen; j++)
                        if (filterTarget[j]) {
                            let updatedTarget = SQExprRewriterWithSourceRenames.rewrite(filterTarget[j], from);
                            updatedFilter.target.push(updatedTarget);
                        }
                }

                updatedWhere.push(updatedFilter);
            }

            return SemanticQuery.createWithTrimmedFrom(from, updatedWhere, this.orderByItems, this.selectItems);
        }

        public addWhere(filter: SemanticFilter): SemanticQuery {
            debug.assertValue(filter, 'filter');

            let updatedWhere: SQFilter[] = this.where(),
                incomingWhere: SQFilter[] = filter.where(),
                from = this.fromValue.clone();

            for (let i = 0, len = incomingWhere.length; i < len; i++) {
                let clause = incomingWhere[i];

                let updatedClause: SQFilter = {
                    condition: SQExprRewriterWithSourceRenames.rewrite(clause.condition, from),
                };

                if (clause.target)
                    updatedClause.target = _.map(clause.target, t => SQExprRewriterWithSourceRenames.rewrite(t, from));

                updatedWhere.push(updatedClause);
            }

            return SemanticQuery.createWithTrimmedFrom(from, updatedWhere, this.orderByItems, this.selectItems);
        }

        public rewrite(exprRewriter: ISQExprVisitor<SQExpr>): SemanticQuery {
            let rewriter = new SemanticQueryRewriter(exprRewriter);
            let from = rewriter.rewriteFrom(this.fromValue);
            let where = rewriter.rewriteWhere(this.whereItems, from);
            let orderBy = rewriter.rewriteOrderBy(this.orderByItems, from);
            let select = rewriter.rewriteSelect(this.selectItems, from);

            return SemanticQuery.createWithTrimmedFrom(from, where, orderBy, select);
        }
    }

    /** Represents a semantic filter condition.  Round-trippable with a JSON FilterDefinition.  Instances of this class are immutable. */
    export class SemanticFilter {
        private fromValue: SQFrom;
        private whereItems: SQFilter[];

        constructor(from: SQFrom, where: SQFilter[]) {
            debug.assertValue(from, 'from');
            debug.assertValue(where, 'where');

            this.fromValue = from;
            this.whereItems = where;
        }

        public static fromSQExpr(contract: SQExpr): SemanticFilter {
            debug.assertValue(contract, 'contract');

            let from = new SQFrom();

            let rewrittenContract = SQExprRewriterWithSourceRenames.rewrite(contract, from);
            // DEVNOTE targets of some filters are visual specific and will get resolved only during query generation.
            //         Thus not setting a target here.
            let where: SQFilter[] = [{
                condition: rewrittenContract
            }];

            return new SemanticFilter(from, where);
        }

        public static getDefaultValueFilter(fieldSQExprs: SQExpr | SQExpr[]): SemanticFilter {
            return SemanticFilter.getDataViewScopeIdentityComparisonFilters(fieldSQExprs, SQExprBuilder.defaultValue());
        }

        public static getAnyValueFilter(fieldSQExprs: SQExpr | SQExpr[]): SemanticFilter {
            return SemanticFilter.getDataViewScopeIdentityComparisonFilters(fieldSQExprs, SQExprBuilder.anyValue());
        }

        private static getDataViewScopeIdentityComparisonFilters(fieldSQExprs: SQExpr | SQExpr[], value: SQExpr): SemanticFilter {
            debug.assertValue(fieldSQExprs, 'fieldSQExprs');
            debug.assertValue(value, 'value');

            if (fieldSQExprs instanceof Array) {
                let values: SQConstantExpr[] = Array.apply(null, Array(fieldSQExprs.length)).map(() => { return value; });
                return SemanticFilter.fromSQExpr(SQExprUtils.getDataViewScopeIdentityComparisonExpr(<SQExpr[]>fieldSQExprs, values));
            }

            return SemanticFilter.fromSQExpr(SQExprBuilder.equal(<SQExpr>fieldSQExprs, value));
        }

        public from(): SQFrom {
            return this.fromValue.clone();
        }

        public conditions(): SQExpr[] {
            let expressions: SQExpr[] = [];

            let where = this.whereItems;
            for (let i = 0, len = where.length; i < len; i++) {
                let filter = where[i];
                expressions.push(filter.condition);
            }
            return expressions;
        }

        public where(): SQFilter[] {
            let result: SQFilter[] = [];

            let whereItems = this.whereItems;
            for (let i = 0, len = whereItems.length; i < len; i++)
                result.push(whereItems[i]);

            return result;
        }

        public rewrite(exprRewriter: ISQExprVisitor<SQExpr>): SemanticFilter {
            let rewriter = new SemanticQueryRewriter(exprRewriter);
            let from = rewriter.rewriteFrom(this.fromValue);
            let where = rewriter.rewriteWhere(this.whereItems, from);

            return new SemanticFilter(from, where);
        }

        public validate(schema: FederatedConceptualSchema, errors?: SQExprValidationError[]): SQExprValidationError[] {
            let validator = new SQExprValidationVisitor(schema, errors);
            this.rewrite(validator);
            return validator.errors;
        }

        /** Merges a list of SemanticFilters into one. */
        public static merge(filters: SemanticFilter[]): SemanticFilter {
            if (ArrayExtensions.isUndefinedOrEmpty(filters))
                return null;

            if (filters.length === 1)
                return filters[0];

            let firstFilter = filters[0];
            let from = firstFilter.from(),
                where: SQFilter[] = ArrayExtensions.take(firstFilter.whereItems, firstFilter.whereItems.length);

            for (let i = 1, len = filters.length; i < len; i++)
                SemanticFilter.applyFilter(filters[i], from, where);

            return new SemanticFilter(from, where);
        }

        public static isDefaultFilter(filter: SemanticFilter): boolean {
            if (!filter || filter.where().length !== 1)
                return false;

            return SQExprUtils.isDefaultValue(filter.where()[0].condition);
        }

        public static isAnyFilter(filter: SemanticFilter): boolean {
            if (!filter || filter.where().length !== 1)
                return false;

            return SQExprUtils.isAnyValue(filter.where()[0].condition);
        }

        public static isSameFilter(leftFilter: SemanticFilter, rightFilter: SemanticFilter): boolean {
            if (jsCommon.JsonComparer.equals<SemanticFilter>(leftFilter, rightFilter)) {
                return !((SemanticFilter.isDefaultFilter(leftFilter) && SemanticFilter.isAnyFilter(rightFilter))
                    || (SemanticFilter.isAnyFilter(leftFilter) && SemanticFilter.isDefaultFilter(rightFilter)));
            }
            return false;
        }

        private static applyFilter(filter: SemanticFilter, from: SQFrom, where: SQFilter[]): void {
            debug.assertValue(filter, 'filter');
            debug.assertValue(from, 'from');
            debug.assertValue(where, 'where');

            // Where
            let filterWhereItems = filter.whereItems;
            for (let i = 0; i < filterWhereItems.length; i++) {
                let filterWhereItem = filterWhereItems[i];

                let updatedWhereItem: SQFilter = {
                    condition: SQExprRewriterWithSourceRenames.rewrite(filterWhereItem.condition, from),
                };

                if (filterWhereItem.target)
                    updatedWhereItem.target = _.map(filterWhereItem.target, e => SQExprRewriterWithSourceRenames.rewrite(e, from));

                where.push(updatedWhereItem);
            }
        }
    }

    /** Represents a SemanticQuery/SemanticFilter from clause. */
    export class SQFrom {
        private items: { [name: string]: SQFromEntitySource };

        constructor(items?: { [name: string]: SQFromEntitySource }) {
            this.items = items || {};
        }

        public keys(): string[] {
            return Object.keys(this.items);
        }

        public entity(key: string): SQFromEntitySource {
            return this.items[key];
        }

        public ensureEntity(entity: SQFromEntitySource, desiredVariableName?: string): QueryFromEnsureEntityResult {
            debug.assertValue(entity, 'entity');

            // 1) Reuse a reference to the entity among the already referenced
            let keys = this.keys();
            for (let i = 0, len = keys.length; i < len; i++) {
                let key = keys[i],
                    item = this.items[key];
                if (item && entity.entity === item.entity && entity.schema === item.schema)
                    return { name: key };
            }

            // 2) Add a reference to the entity
            let candidateName = desiredVariableName || this.candidateName(entity.entity),
                uniqueName: string = candidateName,
                i = 2;
            while (this.items[uniqueName]) {
                uniqueName = candidateName + i++;
            }

            this.items[uniqueName] = entity;
            return { name: uniqueName, new: true };
        }

        public remove(key: string): void {
            delete this.items[key];
        }

        /** Converts the entity name into a short reference name.  Follows the Semantic Query convention of a short name. */
        private candidateName(ref: string): string {
            debug.assertValue(ref, 'ref');

            let idx = ref.lastIndexOf('.');
            if (idx >= 0 && (idx !== ref.length - 1))
                ref = ref.substr(idx + 1);

            return ref.substring(0, 1).toLowerCase();
        }

        public clone(): SQFrom {
            // NOTE: consider deprecating this method and instead making QueryFrom be CopyOnWrite (currently we proactively clone).
            let cloned = new SQFrom();

            // NOTE: we use extend rather than prototypical inheritance on items because we use Object.keys.
            $.extend(cloned.items, this.items);

            return cloned;
        }
    }

    export class SQExprRewriterWithSourceRenames extends SQExprRewriter {
        private renames: SQSourceRenames;

        constructor(renames: SQSourceRenames) {
            debug.assertValue(renames, 'renames');

            super();
            this.renames = renames;
        }

        public visitEntity(expr: SQEntityExpr): SQExpr {
            let updatedName = this.renames[expr.entity];

            if (updatedName)
                return new SQEntityExpr(expr.schema, expr.entity, updatedName);

            return super.visitEntity(expr);
        }

        public rewriteFilter(filter: SQFilter): SQFilter {
            debug.assertValue(filter, 'filter');

            let updatedTargets = undefined;
            if (filter.target)
                updatedTargets = this.rewriteArray(filter.target);

            let updatedCondition = filter.condition.accept(this);

            if (filter.condition === updatedCondition && filter.target === updatedTargets)
                return filter;

            let updatedFilter: SQFilter = {
                condition: updatedCondition,
            };

            if (updatedTargets)
                updatedFilter.target = updatedTargets;

            return updatedFilter;
        }

        public rewriteArray(exprs: SQExpr[]): SQExpr[] {
            debug.assertValue(exprs, 'exprs');

            let updatedExprs: SQExpr[];

            for (let i = 0, len = exprs.length; i < len; i++) {
                let expr = exprs[i],
                    rewrittenExpr = expr.accept(this);

                if (expr !== rewrittenExpr && !updatedExprs)
                    updatedExprs = ArrayExtensions.take(exprs, i);

                if (updatedExprs)
                    updatedExprs.push(rewrittenExpr);
            }

            return updatedExprs || exprs;
        }

        public static rewrite(expr: SQExpr, from: SQFrom): SQExpr {
            debug.assertValue(expr, 'expr');
            debug.assertValue(from, 'from');

            let renames = QuerySourceRenameDetector.run(expr, from);
            let rewriter = new SQExprRewriterWithSourceRenames(renames);
            return expr.accept(rewriter);
        }
    }

    /** Responsible for updating a QueryFrom based on SQExpr references. */
    class QuerySourceRenameDetector extends DefaultSQExprVisitorWithTraversal {
        private from: SQFrom;
        private renames: SQSourceRenames;

        public static run(expr: SQExpr, from: SQFrom): SQSourceRenames {
            let detector = new QuerySourceRenameDetector(from);
            expr.accept(detector);

            return detector.renames;
        }

        constructor(from: SQFrom) {
            debug.assertValue(from, 'from');
            super();

            this.from = from;
            this.renames = {};
        }

        public visitEntity(expr: SQEntityExpr): void {
            // TODO: Renames must take the schema into account, not just entity set name.
            let existingEntity = this.from.entity(expr.variable);
            if (existingEntity && existingEntity.schema === expr.schema && existingEntity.entity === expr.entity)
                return;

            let actualEntity = this.from.ensureEntity(
                {
                    schema: expr.schema,
                    entity: expr.entity,
                },
                expr.variable);

            this.renames[expr.entity] = actualEntity.name;
        }
    }

    /** Visitor for finding unreferenced sources. */
    class UnreferencedKeyFinder extends DefaultSQExprVisitorWithTraversal {
        private keys: string[];

        constructor(keys: string[]) {
            debug.assertValue(keys, 'keys');

            super();
            this.keys = keys;
        }

        public visitEntity(expr: SQEntityExpr): void {
            let index = this.keys.indexOf(expr.variable);
            if (index >= 0)
                this.keys.splice(index, 1);
        }

        public result(): string[] {
            return this.keys;
        }
    }
}