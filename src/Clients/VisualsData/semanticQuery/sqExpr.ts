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
    import StringExtensions = jsCommon.StringExtensions;
    /** Represents an immutable expression within a SemanticQuery. */
    export /*abstract*/ class SQExpr {
        constructor() {
        }

        public static equals(x: SQExpr, y: SQExpr, ignoreCase?: boolean): boolean {
            return SQExprEqualityVisitor.run(x, y, ignoreCase);
        }

        public validate(schema: FederatedConceptualSchema, errors?: SQExprValidationError[]): SQExprValidationError[] {
            let validator = new SQExprValidationVisitor(schema, errors);
            this.accept(validator);
            return validator.errors;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            debug.assertFail('abstract method');
            return;
        }

        public getMetadata(federatedSchema: FederatedConceptualSchema): SQExprMetadata {
            debug.assertValue(federatedSchema, 'federatedSchema');

            let field = SQExprConverter.asFieldPattern(this);
            if (!field)
                return;

            if (field.column || field.columnAggr || field.measure)
                return this.getMetadataForProperty(field, federatedSchema);

            if (field.hierarchyLevel)
                return this.getMetadataForHierarchyLevel(field, federatedSchema);

            if (field.columnHierarchyLevelVariation)
                return this.getMetadataForVariation(field, federatedSchema);

            return SQExpr.getMetadataForEntity(field, federatedSchema);
        }

        public getDefaultAggregate(federatedSchema: FederatedConceptualSchema, forceAggregation: boolean = false): QueryAggregateFunction {
            debug.assertValue(federatedSchema, 'federatedSchema');

            let property = this.getConceptualProperty(federatedSchema);
            if (!property)
                return;

            let aggregate: QueryAggregateFunction;

            if (property && property.kind === ConceptualPropertyKind.Column) {
                let propertyDefaultAggregate = property.column ? property.column.defaultAggregate : null;

                if ((property.type.integer || property.type.numeric) &&
                    propertyDefaultAggregate !== ConceptualDefaultAggregate.None) {
                    aggregate = defaultAggregateToQueryAggregateFunction(propertyDefaultAggregate);
                    if (aggregate === undefined)
                        aggregate = defaultAggregateForDataType(property.type);
                }

                // If we haven't found an appropriate aggregate, and want to force aggregation anyway, 
                // aggregate on CountNonNull.
                if (aggregate === undefined && forceAggregation) {
                    aggregate = QueryAggregateFunction.CountNonNull;
                }
            }

            return aggregate;
        }

        /** Return the SQExpr[] of group on columns if it has group on keys otherwise return the SQExpr of the column.*/
        public getKeyColumns(schema: FederatedConceptualSchema): SQExpr[] {
            let columnRefExpr = SQExprColumnRefInfoVisitor.getColumnRefSQExpr(schema, this);
            if (!columnRefExpr)
                return;

            let keySQExprs: SQExpr[] = [];
            let keys = this.getPropertyKeys(schema);
            if (keys && keys.length > 0) {
                for (let i = 0, len = keys.length; i < len; i++) {
                    keySQExprs.push(SQExprBuilder.columnRef(columnRefExpr.source, keys[i].name));
                }
            }
            else
                keySQExprs.push(columnRefExpr);

            return keySQExprs;
        }

        /** Returns a value indicating whether the expression would group on keys other than itself.*/
        public hasGroupOnKeys(schema: FederatedConceptualSchema): boolean {
            let columnRefExpr = SQExprColumnRefInfoVisitor.getColumnRefSQExpr(schema, this);
            if (!columnRefExpr)
                return;
            let keys = this.getPropertyKeys(schema);

            if (!keys || keys.length < 1)
                return false;

            if (keys.length > 1)
                return true;

            let keySqExpr = SQExprBuilder.columnRef(columnRefExpr.source, keys[0].name);
            return !SQExpr.equals(keySqExpr, this);
        }

        private getPropertyKeys(schema: FederatedConceptualSchema): jsCommon.ArrayNamedItems<ConceptualProperty> {
            let property = this.getConceptualProperty(schema) || this.getHierarchyLevelConceptualProperty(schema);
            if (!property)
                return;

            return property.column ? property.column.keys : undefined;
        }

        public getConceptualProperty(federatedSchema: FederatedConceptualSchema): ConceptualProperty {
            let field = SQExprConverter.asFieldPattern(this);
            if (!field)
                return;

            let fieldExprItem = FieldExprPattern.toFieldExprEntityItemPattern(field);
            let propertyName = FieldExprPattern.getPropertyName(field);

            if (propertyName)
                return federatedSchema
                    .schema(fieldExprItem.schema)
                    .findProperty(fieldExprItem.entity, propertyName);
        }

        public getTargetEntityForVariation(federatedSchema: FederatedConceptualSchema, variationName: string): string {
            let property = this.getConceptualProperty(federatedSchema);
            if (property && property.column && !_.isEmpty(property.column.variations)) {
                let variations = property.column.variations;
                for (let variation of variations)
                    if (variation.name === variationName)
                        return variation.navigationProperty.targetEntity.name;
            }
        }

        private getHierarchyLevelConceptualProperty(federatedSchema: FederatedConceptualSchema): ConceptualProperty {
            let field = SQExprConverter.asFieldPattern(this);
            if (!field)
                return;

            if (field.hierarchyLevel) {
                let fieldExprItem = FieldExprPattern.toFieldExprEntityItemPattern(field);
                let hierarchy = federatedSchema
                    .schema(fieldExprItem.schema)
                    .findHierarchy(fieldExprItem.entity, field.hierarchyLevel.name);

                if (hierarchy) {
                    let hierarchyLevel = hierarchy.levels.withName(field.hierarchyLevel.level);
                    return hierarchyLevel.column;
                }
            }
        }

        private getMetadataForVariation(field: data.FieldExprPattern, federatedSchema: FederatedConceptualSchema): SQExprMetadata {
            debug.assertValue(field, 'field');
            debug.assertValue(federatedSchema, 'federatedSchema');

            let columnHierarchyLevelVariation = field.columnHierarchyLevelVariation;
            let fieldExprItem = FieldExprPattern.toFieldExprEntityItemPattern(field);
            let sourceProperty = federatedSchema
                .schema(fieldExprItem.schema)
                .findProperty(fieldExprItem.entity, columnHierarchyLevelVariation.source.name);

            if (sourceProperty && sourceProperty.column && sourceProperty.column.variations) {
                for (let variation of sourceProperty.column.variations) {
                    if (variation.defaultHierarchy && variation.defaultHierarchy.levels) {
                        for (let level of variation.defaultHierarchy.levels) {
                            if (level.name === columnHierarchyLevelVariation.level.level) {
                                let property = level.column;
                                return {
                                    kind: (property.kind === ConceptualPropertyKind.Measure) ? FieldKind.Measure : FieldKind.Column,
                                    type: property.type,
                                    format: property.format,
                                    idOnEntityKey: property.column ? property.column.idOnEntityKey : false,
                                    defaultAggregate: property.column ? property.column.defaultAggregate : null
                                };
                            }
                        }
                    }
                }
            }
        }
        private getMetadataForHierarchyLevel(field: FieldExprPattern, federatedSchema: FederatedConceptualSchema): SQExprMetadata {
            debug.assertValue(field, 'field');
            debug.assertValue(federatedSchema, 'federatedSchema');

            let property = this.getHierarchyLevelConceptualProperty(federatedSchema);
            if (!property)
                return;

            return this.getPropertyMetadata(field, property);
        }

        private getPropertyMetadata(field: FieldExprPattern, property: ConceptualProperty): SQExprMetadata {
            let format = property.format;
            let type = property.type;
            let columnAggregate = field.columnAggr;

            if (columnAggregate) {
                switch (columnAggregate.aggregate) {
                    case QueryAggregateFunction.Count:
                    case QueryAggregateFunction.CountNonNull:
                        type = ValueType.fromExtendedType(ExtendedType.Integer);
                        format = undefined;
                        break;
                    case QueryAggregateFunction.Avg:
                        if (type.integer)
                            type = ValueType.fromExtendedType(ExtendedType.Double);
                        break;
                }
            }

            return {
                kind: (property.kind === ConceptualPropertyKind.Measure || (columnAggregate && columnAggregate.aggregate !== undefined)) ? FieldKind.Measure : FieldKind.Column,
                type: type,
                format: format,
                idOnEntityKey: property.column ? property.column.idOnEntityKey : false,
                aggregate: columnAggregate ? columnAggregate.aggregate : undefined,
                defaultAggregate: property.column ? property.column.defaultAggregate : null
            };
        }

        private getMetadataForProperty(field: FieldExprPattern, federatedSchema: FederatedConceptualSchema): SQExprMetadata {
            debug.assertValue(field, 'field');
            debug.assertValue(federatedSchema, 'federatedSchema');

            let property = this.getConceptualProperty(federatedSchema);
            if (!property)
                return;

            return this.getPropertyMetadata(field, property);
        }

        private static getMetadataForEntity(field: FieldExprPattern, federatedSchema: FederatedConceptualSchema): SQExprMetadata {
            debug.assertValue(field, 'field');
            debug.assertValue(federatedSchema, 'federatedSchema');

            let fieldExprItem = FieldExprPattern.toFieldExprEntityItemPattern(field);
            let entity = federatedSchema
                .schema(fieldExprItem.schema)
                .entities
                .withName(fieldExprItem.entity);

            if (!entity)
                return;
            
            // We only support count and countnonnull for entity.
            if (field.entityAggr) {
                switch (field.entityAggr.aggregate) {
                    case QueryAggregateFunction.Count:
                    case QueryAggregateFunction.CountNonNull:
                        return {
                            kind: FieldKind.Measure,
                            type: ValueType.fromExtendedType(ExtendedType.Integer),
                            format: undefined,
                            idOnEntityKey: false,
                            aggregate: field.entityAggr.aggregate
                        };
                }
            }
        }
    }

    export interface SQExprMetadata {
        kind: FieldKind;
        type: ValueType;
        format?: string;
        idOnEntityKey?: boolean;
        aggregate?: QueryAggregateFunction;
        defaultAggregate?: ConceptualDefaultAggregate;
    }

    export const enum FieldKind {
        /** Indicates the field references a column, which evaluates to a distinct set of values (e.g., Year, Name, SalesQuantity, etc.). */
        Column,

        /** Indicates the field references a measure, which evaluates to a single value (e.g., SalesYTD, Sum(Sales), etc.). */
        Measure,
    }

    /** Note: Exported for testability */
    export function defaultAggregateForDataType(type: ValueType): QueryAggregateFunction {
        if (type.integer || type.numeric)
            return QueryAggregateFunction.Sum;

        return QueryAggregateFunction.Count;
    }

    /** Note: Exported for testability */
    export function defaultAggregateToQueryAggregateFunction(aggregate: ConceptualDefaultAggregate): QueryAggregateFunction {
        switch (aggregate) {
            case ConceptualDefaultAggregate.Average:
                return QueryAggregateFunction.Avg;
            case ConceptualDefaultAggregate.Count:
                return QueryAggregateFunction.CountNonNull;
            case ConceptualDefaultAggregate.DistinctCount:
                return QueryAggregateFunction.Count;
            case ConceptualDefaultAggregate.Max:
                return QueryAggregateFunction.Max;
            case ConceptualDefaultAggregate.Min:
                return QueryAggregateFunction.Min;
            case ConceptualDefaultAggregate.Sum:
                return QueryAggregateFunction.Sum;
            default:
                return;
        }
    }

    export class SQEntityExpr extends SQExpr {
        public schema: string;
        public entity: string;
        public variable: string;

        constructor(schema: string, entity: string, variable?: string) {
            debug.assertValue(entity, 'entity');

            super();
            this.schema = schema;
            this.entity = entity;
            if (variable)
                this.variable = variable;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitEntity(this, arg);
        }
    }

    export /*abstract*/ class SQPropRefExpr extends SQExpr {
        public ref: string;
        public source: SQExpr;

        constructor(source: SQExpr, ref: string) {
            debug.assertValue(source, 'source');
            debug.assertValue(ref, 'ref');

            super();
            this.source = source;
            this.ref = ref;
        }
    }

    export class SQColumnRefExpr extends SQPropRefExpr {
        constructor(source: SQExpr, ref: string) {
            super(source, ref);
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitColumnRef(this, arg);
        }
    }

    export class SQMeasureRefExpr extends SQPropRefExpr {
        constructor(source: SQExpr, ref: string) {
            super(source, ref);
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitMeasureRef(this, arg);
        }
    }

    export class SQAggregationExpr extends SQExpr {
        public arg: SQExpr;
        public func: QueryAggregateFunction;

        constructor(arg: SQExpr, func: QueryAggregateFunction) {
            debug.assertValue(arg, 'arg');
            debug.assertValue(func, 'func');

            super();
            this.arg = arg;
            this.func = func;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitAggr(this, arg);
        }
    }

    export class SQPropertyVariationSourceExpr extends SQExpr {
        public arg: SQExpr;
        public name: string;
        public property: string;

        constructor(arg: SQExpr, name: string, property: string) {
            debug.assertValue(arg, 'arg');
            debug.assertValue(name, 'name');
            debug.assertValue(property, 'property');

            super();
            this.arg = arg;
            this.name = name;
            this.property = property;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitPropertyVariationSource(this, arg);
        }
    }

    export class SQHierarchyExpr extends SQExpr {
        public arg: SQExpr;
        public hierarchy: string;

        constructor(arg: SQExpr, hierarchy: string) {
            debug.assertValue(arg, 'arg');
            debug.assertValue(hierarchy, 'hierarchy');

            super();
            this.arg = arg;
            this.hierarchy = hierarchy;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitHierarchy(this, arg);
        }
    }

    export class SQHierarchyLevelExpr extends SQExpr {
        public arg: SQExpr;
        public level: string;

        constructor(arg: SQExpr, level: string) {
            debug.assertValue(arg, 'arg');
            debug.assertValue(level, 'level');

            super();
            this.arg = arg;
            this.level = level;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitHierarchyLevel(this, arg);
        }
    }

    export class SQAndExpr extends SQExpr {
        left: SQExpr;
        right: SQExpr;

        constructor(left: SQExpr, right: SQExpr) {
            debug.assertValue(left, 'left');
            debug.assertValue(right, 'right');

            super();
            this.left = left;
            this.right = right;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitAnd(this, arg);
        }
    }

    export class SQBetweenExpr extends SQExpr {
        arg: SQExpr;
        lower: SQExpr;
        upper: SQExpr;

        constructor(arg: SQExpr, lower: SQExpr, upper: SQExpr) {
            debug.assertValue(arg, 'arg');
            debug.assertValue(lower, 'lower');
            debug.assertValue(upper, 'upper');

            super();
            this.arg = arg;
            this.lower = lower;
            this.upper = upper;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitBetween(this, arg);
        }
    }

    export class SQInExpr extends SQExpr {
        args: SQExpr[];
        values: SQExpr[][];

        constructor(args: SQExpr[], values: SQExpr[][]) {
            debug.assertValue(args, 'args');
            debug.assertValue(values, 'values');

            super();
            this.args = args;
            this.values = values;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitIn(this, arg);
        }
    }

    export class SQOrExpr extends SQExpr {
        left: SQExpr;
        right: SQExpr;

        constructor(left: SQExpr, right: SQExpr) {
            debug.assertValue(left, 'left');
            debug.assertValue(right, 'right');

            super();
            this.left = left;
            this.right = right;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitOr(this, arg);
        }
    }

    export class SQCompareExpr extends SQExpr {
        kind: QueryComparisonKind;
        left: SQExpr;
        right: SQExpr;

        constructor(kind: QueryComparisonKind, left: SQExpr, right: SQExpr) {
            debug.assertValue(kind, 'kind');
            debug.assertValue(left, 'left');
            debug.assertValue(right, 'right');

            super();
            this.kind = kind;
            this.left = left;
            this.right = right;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitCompare(this, arg);
        }
    }

    export class SQContainsExpr extends SQExpr {
        left: SQExpr;
        right: SQExpr;

        constructor(left: SQExpr, right: SQExpr) {
            debug.assertValue(left, 'left');
            debug.assertValue(right, 'right');

            super();
            this.left = left;
            this.right = right;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitContains(this, arg);
        }
    }

    export class SQStartsWithExpr extends SQExpr {
        left: SQExpr;
        right: SQExpr;

        constructor(left: SQExpr, right: SQExpr) {
            debug.assertValue(left, 'left');
            debug.assertValue(right, 'right');

            super();
            this.left = left;
            this.right = right;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitStartsWith(this, arg);
        }
    }

    export class SQExistsExpr extends SQExpr {
        arg: SQExpr;

        constructor(arg: SQExpr) {
            debug.assertValue(arg, 'arg');

            super();
            this.arg = arg;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitExists(this, arg);
        }
    }

    export class SQNotExpr extends SQExpr {
        arg: SQExpr;

        constructor(arg: SQExpr) {
            debug.assertValue(arg, 'arg');

            super();
            this.arg = arg;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitNot(this, arg);
        }
    }

    export class SQConstantExpr extends SQExpr {
        public type: ValueType;

        /** The native JavaScript representation of the value. */
        public value: any;

        /** The string encoded, lossless representation of the value. */
        public valueEncoded: string;

        constructor(type: ValueType, value: any, valueEncoded: string) {
            debug.assertValue(type, 'type');

            super();
            this.type = type;
            this.value = value;
            this.valueEncoded = valueEncoded;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitConstant(this, arg);
        }

        public getMetadata(federatedSchema: FederatedConceptualSchema): SQExprMetadata {
            debug.assertValue(federatedSchema, 'federatedSchema');

            return {
                // Returning Measure as the kind for a SQConstantExpr is slightly ambiguous allowing the return object to conform to SQEXprMetadata.
                // A getType or similiar function in the future would be more appropriate. 
                kind: FieldKind.Measure,
                type: this.type,
            };
        }
    }

    export class SQDateSpanExpr extends SQExpr {
        public unit: TimeUnit;
        public arg: SQExpr;

        constructor(unit: TimeUnit, arg: SQExpr) {
            debug.assertValue(unit, 'unit');
            debug.assertValue(arg, 'arg');

            super();
            this.unit = unit;
            this.arg = arg;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitDateSpan(this, arg);
        }
    }

    export class SQDateAddExpr extends SQExpr {
        public unit: TimeUnit;
        public amount: number;
        public arg: SQExpr;

        constructor(unit: TimeUnit, amount: number, arg: SQExpr) {
            debug.assertValue(unit, 'unit');
            debug.assertValue(amount, 'amount');
            debug.assertValue(arg, 'arg');

            super();
            this.unit = unit;
            this.arg = arg;
            this.amount = amount;
        }

        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitDateAdd(this, arg);
        }
    }

    export class SQNowExpr extends SQExpr {
        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitNow(this, arg);
        }
    }

    export class SQDefaultValueExpr extends SQExpr {
        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitDefaultValue(this, arg);
        }
    }

    export class SQAnyValueExpr extends SQExpr {
        public accept<T, TArg>(visitor: ISQExprVisitorWithArg<T, TArg>, arg?: TArg): T {
            return visitor.visitAnyValue(this, arg);
        }
    }

    /** Provides utilities for creating & manipulating expressions. */
    export module SQExprBuilder {
        export function entity(schema: string, entity: string, variable?: string): SQEntityExpr {
            return new SQEntityExpr(schema, entity, variable);
        }

        export function columnRef(source: SQExpr, prop: string): SQColumnRefExpr {
            return new SQColumnRefExpr(source, prop);
        }

        export function measureRef(source: SQExpr, prop: string): SQMeasureRefExpr {
            return new SQMeasureRefExpr(source, prop);
        }

        export function aggregate(source: SQExpr, aggregate: QueryAggregateFunction): SQAggregationExpr {
            return new SQAggregationExpr(source, aggregate);
        }

        export function hierarchy(source: SQExpr, hierarchy: string): SQHierarchyExpr {
            return new SQHierarchyExpr(source, hierarchy);
        }

        export function propertyVariationSource(source: SQExpr, name: string, property: string): SQPropertyVariationSourceExpr {
            return new SQPropertyVariationSourceExpr(source, name, property);
        }

        export function hierarchyLevel(source: SQExpr, level: string): SQHierarchyLevelExpr {
            return new SQHierarchyLevelExpr(source, level);
        }

        export function and(left: SQExpr, right: SQExpr): SQExpr {
            if (!left)
                return right;
            if (!right)
                return left;

            return new SQAndExpr(left, right);
        }

        export function between(arg: SQExpr, lower: SQExpr, upper: SQExpr): SQBetweenExpr {
            return new SQBetweenExpr(arg, lower, upper);
        }

        export function inExpr(args: SQExpr[], values: SQExpr[][]): SQInExpr {
            return new SQInExpr(args, values);
        }

        export function or(left: SQExpr, right: SQExpr): SQExpr {
            if (!left)
                return right;
            if (!right)
                return left;
            if (left instanceof SQInExpr && right instanceof SQInExpr) {
                let inExpr = tryUseInExprs(<SQInExpr>left, <SQInExpr>right);
                if (inExpr)
                    return inExpr;
            }

            return new SQOrExpr(left, right);
        }

        function tryUseInExprs(left: SQInExpr, right: SQInExpr): SQInExpr {
            if (!left.args || !right.args)
                return;

            let leftArgLen = left.args.length;
            let rightArgLen = right.args.length;
            if (leftArgLen !== rightArgLen)
                return;

            for (let i = 0; i < leftArgLen; ++i) {
                if (!SQExpr.equals(left.args[i], right.args[i]))
                    return;
            }

            let combinedValues = left.values.concat(right.values);
            return SQExprBuilder.inExpr(left.args, combinedValues);
        }

        export function compare(kind: QueryComparisonKind, left: SQExpr, right: SQExpr): SQCompareExpr {
            return new SQCompareExpr(kind, left, right);
        }

        export function contains(left: SQExpr, right: SQExpr): SQContainsExpr {
            return new SQContainsExpr(left, right);
        }

        export function exists(arg: SQExpr): SQExistsExpr {
            return new SQExistsExpr(arg);
        }

        export function equal(left: SQExpr, right: SQExpr): SQCompareExpr {
            return compare(QueryComparisonKind.Equal, left, right);
        }

        export function not(arg: SQExpr): SQNotExpr {
            return new SQNotExpr(arg);
        }

        export function startsWith(left: SQExpr, right: SQExpr): SQStartsWithExpr {
            return new SQStartsWithExpr(left, right);
        }

        export function nullConstant(): SQConstantExpr {
            return new SQConstantExpr(
                ValueType.fromExtendedType(ExtendedType.Null),
                null,
                PrimitiveValueEncoding.nullEncoding());
        }

        export function now(): SQNowExpr {
            return new SQNowExpr();
        }

        export function defaultValue(): SQDefaultValueExpr {
            return new SQDefaultValueExpr();
        }

        export function anyValue(): SQAnyValueExpr {
            return new SQAnyValueExpr();
        }

        export function boolean(value: boolean): SQConstantExpr {
            return new SQConstantExpr(
                ValueType.fromExtendedType(ExtendedType.Boolean),
                value,
                PrimitiveValueEncoding.boolean(value));
        }

        export function dateAdd(unit: TimeUnit, amount: number, arg: SQExpr): SQDateAddExpr {
            return new SQDateAddExpr(unit, amount, arg);
        }

        export function dateTime(value: Date, valueEncoded?: string): SQConstantExpr {
            if (valueEncoded === undefined)
                valueEncoded = PrimitiveValueEncoding.dateTime(value);

            return new SQConstantExpr(ValueType.fromExtendedType(ExtendedType.DateTime), value, valueEncoded);
        }

        export function dateSpan(unit: TimeUnit, arg: SQExpr): SQDateSpanExpr {
            return new SQDateSpanExpr(unit, arg);
        }

        export function decimal(value: number, valueEncoded?: string): SQConstantExpr {
            if (valueEncoded === undefined)
                valueEncoded = PrimitiveValueEncoding.decimal(value);

            return new SQConstantExpr(ValueType.fromExtendedType(ExtendedType.Decimal), value, valueEncoded);
        }

        export function double(value: number, valueEncoded?: string): SQConstantExpr {
            if (valueEncoded === undefined)
                valueEncoded = PrimitiveValueEncoding.double(value);

            return new SQConstantExpr(ValueType.fromExtendedType(ExtendedType.Double), value, valueEncoded);
        }

        export function integer(value: number, valueEncoded?: string): SQConstantExpr {
            if (valueEncoded === undefined)
                valueEncoded = PrimitiveValueEncoding.integer(value);

            return new SQConstantExpr(ValueType.fromExtendedType(ExtendedType.Integer), value, valueEncoded);
        }

        export function text(value: string, valueEncoded?: string): SQConstantExpr {
            debug.assert(!valueEncoded || valueEncoded === PrimitiveValueEncoding.text(value), 'Incorrect encoded value specified.');

            return new SQConstantExpr(
                ValueType.fromExtendedType(ExtendedType.Text),
                value,
                valueEncoded || PrimitiveValueEncoding.text(value));
        }

        export function setAggregate(expr: SQExpr, aggregate: QueryAggregateFunction): SQExpr {
            return SQExprChangeAggregateRewriter.rewrite(expr, aggregate);
        }

        export function removeAggregate(expr: SQExpr): SQExpr {
            return SQExprRemoveAggregateRewriter.rewrite(expr);
        }

        export function removeEntityVariables(expr: SQExpr): SQExpr {
            return SQExprRemoveEntityVariablesRewriter.rewrite(expr);
        }

        export function createExprWithAggregate(
            expr: SQExpr,
            schema: FederatedConceptualSchema,
            aggregateNonNumericFields: boolean,
            preferredAggregate?: QueryAggregateFunction): SQExpr {

            debug.assertValue(expr, 'expr');
            debug.assertValue(expr, 'schema');

            let aggregate: QueryAggregateFunction;
            if (preferredAggregate != null && SQExprUtils.isSupportedAggregate(expr, schema, preferredAggregate)) {
                aggregate = preferredAggregate;
            }
            else {
                aggregate = expr.getDefaultAggregate(schema, aggregateNonNumericFields);
            }
            if (aggregate !== undefined)
                expr = SQExprBuilder.aggregate(expr, aggregate);

            return expr;
        }
    }

    /** Provides utilities for obtaining information about expressions. */
    export module SQExprInfo {
        export function getAggregate(expr: SQExpr): QueryAggregateFunction {
            return SQExprAggregateInfoVisitor.getAggregate(expr);
        }
    }

    class SQExprEqualityVisitor implements ISQExprVisitorWithArg<boolean, SQExpr> {
        private static instance: SQExprEqualityVisitor = new SQExprEqualityVisitor(/* ignoreCase */ false);
        private static ignoreCaseInstance: SQExprEqualityVisitor = new SQExprEqualityVisitor(true);
        private ignoreCase: boolean;

        public static run(x: SQExpr, y: SQExpr, ignoreCase?: boolean): boolean {
            // Normalize falsy to null
            x = x || null;
            y = y || null;

            if (x === y)
                return true;

            if (!x !== !y)
                return false;

            debug.assertValue(x, 'x');
            debug.assertValue(y, 'y');
            if (ignoreCase)
                return x.accept(SQExprEqualityVisitor.ignoreCaseInstance, y);

            return x.accept(SQExprEqualityVisitor.instance, y);
        }

        constructor(ignoreCase: boolean) {
            this.ignoreCase = ignoreCase;
        }

        public visitColumnRef(expr: SQColumnRefExpr, comparand: SQColumnRefExpr): boolean {
            return comparand instanceof SQColumnRefExpr &&
                expr.ref === (<SQColumnRefExpr>comparand).ref &&
                this.equals(expr.source, (<SQColumnRefExpr>comparand).source);
        }

        public visitMeasureRef(expr: SQMeasureRefExpr, comparand: SQMeasureRefExpr): boolean {
            return comparand instanceof SQMeasureRefExpr &&
                expr.ref === (<SQMeasureRefExpr>comparand).ref &&
                this.equals(expr.source, (<SQMeasureRefExpr>comparand).source);
        }

        public visitAggr(expr: SQAggregationExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQAggregationExpr &&
                expr.func === (<SQAggregationExpr>comparand).func &&
                this.equals(expr.arg, (<SQAggregationExpr>comparand).arg);
        }

        public visitHierarchy(expr: SQHierarchyExpr, comparand: SQHierarchyExpr): boolean {
            return comparand instanceof SQHierarchyExpr &&
                expr.hierarchy === comparand.hierarchy &&
                this.equals(expr.arg, comparand.arg);
        }

        public visitHierarchyLevel(expr: SQHierarchyLevelExpr, comparand: SQHierarchyLevelExpr): boolean {
            return comparand instanceof SQHierarchyLevelExpr &&
                expr.level === comparand.level &&
                this.equals(expr.arg, comparand.arg);
        }

        public visitPropertyVariationSource(expr: SQPropertyVariationSourceExpr, comparand: SQPropertyVariationSourceExpr): boolean {
            return comparand instanceof SQPropertyVariationSourceExpr &&
                expr.name === comparand.name &&
                expr.property === comparand.property &&
                this.equals(expr.arg, comparand.arg);
        }

        public visitBetween(expr: SQBetweenExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQBetweenExpr &&
                this.equals(expr.arg, (<SQBetweenExpr>comparand).arg) &&
                this.equals(expr.lower, (<SQBetweenExpr>comparand).lower) &&
                this.equals(expr.upper, (<SQBetweenExpr>comparand).upper);
        }

        public visitIn(expr: SQInExpr, comparand: SQExpr): boolean {
            if (!(comparand instanceof SQInExpr) || !this.equalsAll(expr.args, (<SQInExpr>comparand).args))
                return false;

            let values = expr.values,
                compareValues = (<SQInExpr>comparand).values;
            if (values.length !== compareValues.length)
                return false;

            for (let i = 0, len = values.length; i < len; i++) {
                if (!this.equalsAll(values[i], compareValues[i]))
                    return false;
            }

            return true;
        }

        public visitEntity(expr: SQEntityExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQEntityExpr &&
                expr.schema === (<SQEntityExpr>comparand).schema &&
                expr.entity === (<SQEntityExpr>comparand).entity &&
                this.optionalEqual(expr.variable, (<SQEntityExpr>comparand).variable);
        }

        public visitAnd(expr: SQAndExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQAndExpr &&
                this.equals(expr.left, (<SQAndExpr>comparand).left) &&
                this.equals(expr.right, (<SQAndExpr>comparand).right);
        }

        public visitOr(expr: SQOrExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQOrExpr &&
                this.equals(expr.left, (<SQOrExpr>comparand).left) &&
                this.equals(expr.right, (<SQOrExpr>comparand).right);
        }

        public visitCompare(expr: SQCompareExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQCompareExpr &&
                expr.kind === (<SQCompareExpr>comparand).kind &&
                this.equals(expr.left, (<SQCompareExpr>comparand).left) &&
                this.equals(expr.right, (<SQCompareExpr>comparand).right);
        }

        public visitContains(expr: SQContainsExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQContainsExpr &&
                this.equals(expr.left, (<SQContainsExpr>comparand).left) &&
                this.equals(expr.right, (<SQContainsExpr>comparand).right);
        }

        public visitDateSpan(expr: SQDateSpanExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQDateSpanExpr &&
                expr.unit === (<SQDateSpanExpr>comparand).unit &&
                this.equals(expr.arg, (<SQDateSpanExpr>comparand).arg);
        }

        public visitDateAdd(expr: SQDateAddExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQDateAddExpr &&
                expr.unit === (<SQDateAddExpr>comparand).unit &&
                expr.amount === (<SQDateAddExpr>comparand).amount &&
                this.equals(expr.arg, (<SQDateAddExpr>comparand).arg);
        }

        public visitExists(expr: SQExistsExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQExistsExpr &&
                this.equals(expr.arg, (<SQExistsExpr>comparand).arg);
        }

        public visitNot(expr: SQNotExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQNotExpr &&
                this.equals(expr.arg, (<SQNotExpr>comparand).arg);
        }

        public visitNow(expr: SQNowExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQNowExpr;
        }

        public visitDefaultValue(expr: SQDefaultValueExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQDefaultValueExpr;
        }

        public visitAnyValue(expr: SQAnyValueExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQAnyValueExpr;
        }

        public visitStartsWith(expr: SQStartsWithExpr, comparand: SQExpr): boolean {
            return comparand instanceof SQStartsWithExpr &&
                this.equals(expr.left, (<SQStartsWithExpr>comparand).left) &&
                this.equals(expr.right, (<SQStartsWithExpr>comparand).right);
        }

        public visitConstant(expr: SQConstantExpr, comparand: SQExpr): boolean {
            if (comparand instanceof SQConstantExpr && expr.type === (<SQConstantExpr>comparand).type)
                return expr.type.text && this.ignoreCase ?
                    StringExtensions.equalIgnoreCase(expr.valueEncoded, (<SQConstantExpr>comparand).valueEncoded) :
                    expr.valueEncoded === (<SQConstantExpr>comparand).valueEncoded;

            return false;
        }

        private optionalEqual(x: string, y: string) {
            // Only check equality if both values are specified.
            if (x && y)
                return x === y;

            return true;
        }

        private equals(x: SQExpr, y: SQExpr): boolean {
            return x.accept(this, y);
        }

        private equalsAll(x: SQExpr[], y: SQExpr[]): boolean {
            let len = x.length;
            if (len !== y.length)
                return false;

            for (let i = 0; i < len; i++) {
                if (!this.equals(x[i], y[i]))
                    return false;
            }

            return true;
        }
    }

    /** Rewrites a root-level expression. */
    class SQExprRootRewriter extends DefaultSQExprVisitor<SQExpr> {
        public visitDefault(expr: SQExpr): SQExpr {
            return expr;
        }
    }

    export const enum SQExprValidationError {
        invalidAggregateFunction,
        invalidSchemaReference,
        invalidEntityReference,
        invalidColumnReference,
        invalidMeasureReference,
        invalidLeftOperandType,
        invalidRightOperandType,
        invalidValueType,
    }

    export class SQExprValidationVisitor extends SQExprRewriter {
        public errors: SQExprValidationError[];
        private schema: FederatedConceptualSchema;

        constructor(schema: FederatedConceptualSchema, errors?: SQExprValidationError[]) {
            debug.assertValue(schema, 'schema');

            super();
            this.schema = schema;
            if (errors)
                this.errors = errors;
        }

        public visitIn(expr: SQInExpr): SQExpr {
            let inExpr = <SQInExpr>super.visitIn(expr);
            let args = inExpr.args;
            let values = inExpr.values;
            for (let valueTuple of values) {
                debug.assert(valueTuple.length === args.length, 'args and value tuple are not the same length');
                for (let i = 0, len = valueTuple.length; i < len; ++i)
                    this.validateCompatibleType(args[i], valueTuple[i]);
            }

            return inExpr;
        }

        public visitCompare(expr: SQCompareExpr): SQExpr {
            let compareExpr = <SQCompareExpr>super.visitCompare(expr);
            this.validateCompatibleType(compareExpr.left, compareExpr.right);

            return compareExpr;
        }

        public visitColumnRef(expr: SQColumnRefExpr): SQExpr {
            let fieldExpr = SQExprConverter.asFieldPattern(expr);
            if (fieldExpr) {
                let fieldExprItem = FieldExprPattern.toFieldExprEntityItemPattern(fieldExpr);
                let entity = this.validateEntity(fieldExprItem.schema, fieldExprItem.entity);
                if (entity) {
                    let prop = entity.properties.withName(fieldExpr.column.name);
                    if (!prop ||
                        prop.kind !== ConceptualPropertyKind.Column ||
                        !this.isQueryable(fieldExpr))
                        this.register(SQExprValidationError.invalidColumnReference);
                }
            }
            return expr;
        }

        public visitMeasureRef(expr: SQMeasureRefExpr): SQExpr {
            let fieldExpr = SQExprConverter.asFieldPattern(expr);
            if (fieldExpr) {
                let fieldExprItem = FieldExprPattern.toFieldExprEntityItemPattern(fieldExpr);
                let entity = this.validateEntity(fieldExprItem.schema, fieldExprItem.entity);
                if (entity) {
                    let prop = entity.properties.withName(fieldExpr.measure.name);
                    if (!prop ||
                        prop.kind !== ConceptualPropertyKind.Measure ||
                        !this.isQueryable(fieldExpr))
                        this.register(SQExprValidationError.invalidMeasureReference);
                }
            }
            return expr;
        }

        public visitAggr(expr: SQAggregationExpr): SQExpr {
            let aggregateExpr = <SQAggregationExpr>super.visitAggr(expr);

            let columnRefExpr = SQExprColumnRefInfoVisitor.getColumnRefSQExpr(this.schema, aggregateExpr.arg);
            if (columnRefExpr) {
                let supportedFuncs = SQExprUtils.getSupportedAggregates(columnRefExpr, this.schema);
                if (supportedFuncs.indexOf(expr.func) < 0)
                    this.register(SQExprValidationError.invalidAggregateFunction);
            }

            return aggregateExpr;
        }

        public visitEntity(expr: SQEntityExpr): SQExpr {
            this.validateEntity(expr.schema, expr.entity);
            return expr;
        }

        public visitContains(expr: SQContainsExpr): SQExpr {
            let left = expr.left;
            let right = expr.right;

            if (!(left instanceof SQColumnRefExpr))
                this.register(SQExprValidationError.invalidLeftOperandType);
            else {
                this.visitColumnRef(<SQColumnRefExpr>left);
                if (!(right instanceof SQConstantExpr) || !(<SQConstantExpr>right).type.text)
                    this.register(SQExprValidationError.invalidRightOperandType);
                else
                    this.validateCompatibleType(left, right);
            }

            return expr;
        }

        public visitStartsWith(expr: SQContainsExpr): SQExpr {
            let left = expr.left;
            let right = expr.right;

            if (!(left instanceof SQColumnRefExpr))
                this.register(SQExprValidationError.invalidLeftOperandType);
            else {
                this.visitColumnRef(<SQColumnRefExpr>left);
                if (!(right instanceof SQConstantExpr) || !(<SQConstantExpr>right).type.text)
                    this.register(SQExprValidationError.invalidRightOperandType);
                else
                    this.validateCompatibleType(left, right);
            }

            return expr;
        }

        private validateCompatibleType(left: SQExpr, right: SQExpr): void {
            let leftMetadata = left.getMetadata(this.schema),
                leftType = leftMetadata && leftMetadata.type,
                rightMetadata = right.getMetadata(this.schema),
                rightType = rightMetadata && rightMetadata.type;

            if (leftType && rightType && !leftType.isCompatibleFrom(rightType))
                this.register(SQExprValidationError.invalidValueType);
        }

        private validateEntity(schemaName: string, entityName: string): ConceptualEntity {
            let schema = this.schema.schema(schemaName);
            if (schema) {
                let entity = schema.entities.withName(entityName);
                if (entity)
                    return entity;

                this.register(SQExprValidationError.invalidEntityReference);
            }
            else {
                this.register(SQExprValidationError.invalidSchemaReference);
            }
        }

        private register(error: SQExprValidationError) {
            if (!this.errors)
                this.errors = [];
            this.errors.push(error);
        }

        private isQueryable(fieldExpr: FieldExprPattern): boolean {
            let fieldExprItem = FieldExprPattern.toFieldExprEntityItemPattern(fieldExpr);
            if (fieldExpr.hierarchyLevel) {
                let hierarchyLevelConceptualProperty = SQHierarchyExprUtils.getConceptualHierarchyLevelFromExpr(this.schema, fieldExpr);
                return hierarchyLevelConceptualProperty && hierarchyLevelConceptualProperty.column.queryable !== ConceptualQueryableState.Error;
            }

            return this.schema.schema(fieldExprItem.schema).findProperty(fieldExprItem.entity, FieldExprPattern.getPropertyName(fieldExpr)).queryable !== ConceptualQueryableState.Error;
        }
    }

    /** Returns an expression's aggregate function, or undefined if it doesn't have one. */
    class SQExprAggregateInfoVisitor extends DefaultSQExprVisitor<QueryAggregateFunction> {
        public visitAggr(expr: SQAggregationExpr): QueryAggregateFunction {
            return expr.func;
        }

        public visitDefault(expr: SQExpr): QueryAggregateFunction {
            return;
        }

        public static getAggregate(expr: SQExpr): QueryAggregateFunction {
            let visitor = new SQExprAggregateInfoVisitor();
            return expr.accept(visitor);
        }
    }

    module SQHierarchyExprUtils {
        export function getConceptualHierarchyLevelFromExpr(
            conceptualSchema: FederatedConceptualSchema,
            fieldExpr: FieldExprPattern): ConceptualHierarchyLevel {
            let fieldExprItem = FieldExprPattern.toFieldExprEntityItemPattern(fieldExpr);
            if (fieldExpr.hierarchyLevel)
                return SQHierarchyExprUtils.getConceptualHierarchyLevel(
                    conceptualSchema,
                    fieldExprItem.schema,
                    fieldExprItem.entity,
                    fieldExpr.hierarchyLevel.name,
                    fieldExpr.hierarchyLevel.level);
        }

        export function getConceptualHierarchyLevel(
            conceptualSchema: FederatedConceptualSchema,
            schemaName: string,
            entity: string,
            hierarchy: string,
            hierarchyLevel: string): ConceptualHierarchyLevel {

            let schema = conceptualSchema.schema(schemaName);
            let hierarchyLevelColumn = schema.findHierarchy(entity, hierarchy);
            if (hierarchyLevelColumn) {
                return hierarchyLevelColumn.levels.withName(hierarchyLevel);
            }
        }
    }

    /** Returns a SQExprColumnRef expression or undefined.*/
    class SQExprColumnRefInfoVisitor extends DefaultSQExprVisitor<SQColumnRefExpr> {
        private schema: FederatedConceptualSchema;

        constructor(schema: FederatedConceptualSchema) {
            super();
            this.schema = schema;
        }

        public visitColumnRef(expr: SQColumnRefExpr): SQColumnRefExpr {
            return expr;
        }

        public visitHierarchyLevel(expr: SQHierarchyLevelExpr): SQColumnRefExpr {
            let ref: string = expr.level;
            let hierarchy = <SQHierarchyExpr>(expr.arg);
            let sourceExpr: SQColumnRefExpr = hierarchy.accept(this);

            if (hierarchy && hierarchy.arg instanceof SQPropertyVariationSourceExpr) {
                let propertyVariationSource = <SQPropertyVariationSourceExpr>hierarchy.arg;
                let targetEntity = sourceExpr.getTargetEntityForVariation(this.schema, propertyVariationSource.name);

                if (sourceExpr && targetEntity) {
                    let schemaName = (<SQEntityExpr>(sourceExpr.source)).schema;
                    let targetEntityExpr = SQExprBuilder.entity(schemaName, targetEntity);
                    let schemaHierarchy = this.schema.schema(schemaName).findHierarchy(targetEntity, hierarchy.hierarchy);

                    if (schemaHierarchy) {
                        for (let level of schemaHierarchy.levels)
                            if (level.name === ref)
                                return new SQColumnRefExpr(targetEntityExpr, level.column.name);
                    }
                }
            }
            else {
                let entityExpr = <SQEntityExpr>(hierarchy.arg);
                let hierarchyLevelRef = SQHierarchyExprUtils.getConceptualHierarchyLevel(this.schema,
                    entityExpr.schema,
                    entityExpr.entity,
                    hierarchy.hierarchy,
                    expr.level);

                if (hierarchyLevelRef)
                    return new SQColumnRefExpr(hierarchy.arg, hierarchyLevelRef.column.name);
            }
        }

        public visitHierarchy(expr: SQHierarchyExpr): SQColumnRefExpr {
            return expr.arg.accept(this);
        }

        public visitPropertyVariationSource(expr: SQPropertyVariationSourceExpr): SQColumnRefExpr {
            let propertyName = expr.property;
            return new SQColumnRefExpr(expr.arg, propertyName);
        }

        public visitDefault(expr: SQExpr): SQColumnRefExpr {
            return;
        }

        public static getColumnRefSQExpr(schema: FederatedConceptualSchema, expr: SQExpr): SQColumnRefExpr {
            let visitor = new SQExprColumnRefInfoVisitor(schema);
            return expr.accept(visitor);
        }
    }

    class SQExprChangeAggregateRewriter extends SQExprRootRewriter {
        private func: QueryAggregateFunction;

        constructor(func: QueryAggregateFunction) {
            debug.assertValue(func, 'func');

            super();
            this.func = func;
        }

        public visitAggr(expr: SQAggregationExpr): SQExpr {
            if (expr.func === this.func)
                return expr;

            return new SQAggregationExpr(expr.arg, this.func);
        }

        public visitColumnRef(expr: SQColumnRefExpr): SQExpr {
            return new SQAggregationExpr(expr, this.func);
        }

        public static rewrite(expr: SQExpr, func: QueryAggregateFunction): SQExpr {
            debug.assertValue(expr, 'expr');
            debug.assertValue(func, 'func');

            let rewriter = new SQExprChangeAggregateRewriter(func);
            return expr.accept(rewriter);
        }
    }

    class SQExprRemoveAggregateRewriter extends SQExprRootRewriter {
        private static instance: SQExprRemoveAggregateRewriter = new SQExprRemoveAggregateRewriter();

        public visitAggr(expr: SQAggregationExpr): SQExpr {
            return expr.arg;
        }

        public static rewrite(expr: SQExpr): SQExpr {
            debug.assertValue(expr, 'expr');

            return expr.accept(SQExprRemoveAggregateRewriter.instance);
        }
    }

    class SQExprRemoveEntityVariablesRewriter extends SQExprRewriter {
        private static instance: SQExprRemoveEntityVariablesRewriter = new SQExprRemoveEntityVariablesRewriter();

        public visitEntity(expr: SQEntityExpr): SQExpr {
            if (expr.variable)
                return SQExprBuilder.entity(expr.schema, expr.entity);

            return expr;
        }

        public static rewrite(expr: SQExpr): SQExpr {
            debug.assertValue(expr, 'expr');

            return expr.accept(SQExprRemoveEntityVariablesRewriter.instance);
        }
    }
}