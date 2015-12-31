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
    export interface DataViewObjectDefinitionsByRepetition {
        metadataOnce?: DataViewObjectDefinitionsForSelector;
        userDefined?: DataViewObjectDefinitionsForSelector[];
        metadata?: DataViewObjectDefinitionsForSelector[];
        data: DataViewObjectDefinitionsForSelectorWithRule[];
    }

    export interface DataViewObjectDefinitionsForSelector {
        selector?: Selector;
        objects: DataViewNamedObjectDefinition[];
    }

    export interface DataViewObjectDefinitionsForSelectorWithRule extends DataViewObjectDefinitionsForSelector {
        rules?: RuleEvaluation[];
    }

    export interface DataViewNamedObjectDefinition {
        name: string;
        properties: DataViewObjectPropertyDefinitions;
    }

    export module DataViewObjectEvaluationUtils {
        export function evaluateDataViewObjects(
            evalContext: IEvalContext,
            objectDescriptors: DataViewObjectDescriptors,
            objectDefns: DataViewNamedObjectDefinition[]): DataViewObjects {
            debug.assertValue(evalContext, 'evalContext');
            debug.assertValue(objectDescriptors, 'objectDescriptors');
            debug.assertValue(objectDefns, 'objectDefns');

            let objects: DataViewObjects;

            for (let j = 0, jlen = objectDefns.length; j < jlen; j++) {
                let objectDefinition = objectDefns[j],
                    objectName = objectDefinition.name;

                let evaluatedObject: DataViewObject = DataViewObjectEvaluator.run(
                    evalContext,
                    objectDescriptors[objectName],
                    objectDefinition.properties);

                if (!evaluatedObject)
                    continue;

                if (!objects)
                    objects = {};

                // NOTE: this currently has last-object-wins semantics.
                objects[objectName] = evaluatedObject;
            }

            return objects;
        }

        export function groupObjectsBySelector(objectDefinitions: DataViewObjectDefinitions): DataViewObjectDefinitionsByRepetition {
            debug.assertAnyValue(objectDefinitions, 'objectDefinitions');

            let grouped: DataViewObjectDefinitionsByRepetition = {
                data: [],
            };

            if (objectDefinitions) {
                for (let objectName in objectDefinitions) {
                    let objectDefnList = objectDefinitions[objectName];

                    for (let i = 0, len = objectDefnList.length; i < len; i++) {
                        let objectDefn = objectDefnList[i];

                        ensureDefinitionListForSelector(grouped, objectDefn.selector).objects.push({
                            name: objectName,
                            properties: objectDefn.properties,
                        });
                    }
                }
            }

            return grouped;
        }

        function ensureDefinitionListForSelector(grouped: DataViewObjectDefinitionsByRepetition, selector: Selector): DataViewObjectDefinitionsForSelector {
            debug.assertValue(grouped, 'grouped');
            debug.assertAnyValue(selector, 'selector');

            if (!selector) {
                if (!grouped.metadataOnce)
                    grouped.metadataOnce = { objects: [] };
                return grouped.metadataOnce;
            }

            let groupedObjects: DataViewObjectDefinitionsForSelector[];
            if (selector.data) {
                groupedObjects = grouped.data;
            }
            else if (selector.metadata) {
                if (!grouped.metadata)
                    grouped.metadata = [];
                groupedObjects = grouped.metadata;
            }
            else if (selector.id) {
                if (!grouped.userDefined)
                    grouped.userDefined = [];
                groupedObjects = grouped.userDefined;
            }

            debug.assert(!!groupedObjects, 'GroupedObjects is not defined.  Indicates malformed selector.');

            for (let item of groupedObjects) {
                if (Selector.equals(selector, item.selector))
                    return item;
            }

            let item: DataViewObjectDefinitionsForSelector = {
                selector: selector,
                objects: [],
            };
            groupedObjects.push(item);

            return item;
        }

        export function addImplicitObjects(
            objectsForAllSelectors: DataViewObjectDefinitionsByRepetition,
            objectDescriptors: DataViewObjectDescriptors,
            columns: DataViewMetadataColumn[],
            selectTransforms: DataViewSelectTransform[]): void {
            debug.assertValue(objectsForAllSelectors, 'objectsForAllSelectors');
            debug.assertValue(objectDescriptors, 'objectDescriptors');
            debug.assertValue(columns, 'columns');
            debug.assertAnyValue(selectTransforms, 'selectTransforms');

            if (selectTransforms) {
                addDefaultFormatString(objectsForAllSelectors, objectDescriptors, columns, selectTransforms);
                addDefaultValue(objectsForAllSelectors, objectDescriptors, columns, selectTransforms);
            }
        }

        function addDefaultFormatString(
            objectsForAllSelectors: DataViewObjectDefinitionsByRepetition,
            objectDescriptors: DataViewObjectDescriptors,
            columns: DataViewMetadataColumn[],
            selectTransforms: DataViewSelectTransform[]): void {
            debug.assertValue(objectsForAllSelectors, 'objectsForAllSelectors');
            debug.assertValue(objectDescriptors, 'objectDescriptors');
            debug.assertValue(columns, 'columns');
            debug.assertValue(selectTransforms, 'selectTransforms');

            let formatStringProp = DataViewObjectDescriptors.findFormatString(objectDescriptors);
            if (!formatStringProp)
                return;

            for (let selectIdx = 0, selectLen = selectTransforms.length; selectIdx < selectLen; selectIdx++) {
                let selectTransform = selectTransforms[selectIdx];
                if (!selectTransform)
                    continue;
                debug.assertValue(selectTransform.queryName, 'selectTransform.queryName');

                applyFormatString(
                    objectsForAllSelectors,
                    formatStringProp,
                    selectTransform.queryName,
                    selectTransform.format || getColumnFormatForIndex(columns, selectIdx));
            }
        }

        /** Registers properties for default value, if the properties are not explicitly provided. */
        function addDefaultValue (
            objectsForAllSelectors: DataViewObjectDefinitionsByRepetition,
            objectDescriptors: DataViewObjectDescriptors,
            columns: DataViewMetadataColumn[],
            selectTransforms: DataViewSelectTransform[]): void {
            debug.assertValue(objectsForAllSelectors, 'objectsForAllSelectors');
            debug.assertValue(objectDescriptors, 'objectDescriptors');
            debug.assertValue(columns, 'columns');
            debug.assertValue(selectTransforms, 'selectTransforms');

            let defaultValueProp = DataViewObjectDescriptors.findDefaultValue(objectDescriptors);
            if (!defaultValueProp)
                return;

            for (let selectTransform of selectTransforms) {
                if (!selectTransform)
                    continue;
                debug.assertValue(selectTransform.queryName, 'selectTransform.queryName');

                applyDefaultValue(
                    objectsForAllSelectors,
                    defaultValueProp,
                    selectTransform.queryName,
                    selectTransform.defaultValue);
            }
        }

        function getColumnFormatForIndex(columns: DataViewMetadataColumn[], selectIdx: number): string {
            for (let columnIdx = 0, columnLen = columns.length; columnIdx < columnLen; columnIdx++) {
                let column = columns[columnIdx];
                if (!column || column.index !== selectIdx)
                    continue;

                return column.format;
            }
        }

        function applyFormatString(
            objectsForAllSelectors: DataViewObjectDefinitionsByRepetition,
            formatStringProp: DataViewObjectPropertyIdentifier,
            queryName: string,
            formatStringValue: string): void {
            if (!formatStringValue)
                return;

            // There is a format string specified -- apply it as an object property, if there is not already one specified.
            applyMetadataProperty(
                objectsForAllSelectors,
                formatStringProp,
                { metadata: queryName },
                SQExprBuilder.text(formatStringValue));
        }

        function applyDefaultValue(
            objectsForAllSelectors: DataViewObjectDefinitionsByRepetition,
            defaultValueProp: DataViewObjectPropertyIdentifier,
            queryName: string,
            defaultValue: DefaultValueDefinition): void {
            if (!defaultValue)
                return;

            // There is a default value specified -- apply it as an object property, if there is not already one specified.
            applyMetadataProperty(
                objectsForAllSelectors,
                defaultValueProp,
                { metadata: queryName },
                defaultValue);
        }

        function applyMetadataProperty(
            objectsForAllSelectors: DataViewObjectDefinitionsByRepetition,
            propertyId: DataViewObjectPropertyIdentifier,
            selector: Selector,
            value: DataViewObjectPropertyDefinition): void {

            let objectDefns: DataViewObjectDefinitionsForSelector[];
            if (selector) {
                let metadataObjects = objectsForAllSelectors.metadata;
                if (!metadataObjects)
                    metadataObjects = objectsForAllSelectors.metadata = [];
                objectDefns = metadataObjects;
            }
            else {
                let metadataOnce = objectsForAllSelectors.metadataOnce;
                if (!metadataOnce)
                    metadataOnce = objectsForAllSelectors.metadataOnce = { selector: selector, objects: [] };
                objectDefns = [metadataOnce];
            }

            let targetMetadataObject = findWithMatchingSelector(objectDefns, selector);
            let targetObjectDefn: DataViewNamedObjectDefinition;
            if (targetMetadataObject) {
                let targetObjectDefns = targetMetadataObject.objects;
                targetObjectDefn = findExistingObject(targetObjectDefns, propertyId.objectName);
                if (targetObjectDefn) {
                    if (targetObjectDefn.properties[propertyId.propertyName])
                        return;
                }
                else {
                    targetObjectDefn = {
                        name: propertyId.objectName,
                        properties: {},
                    };
                    targetObjectDefns.push(targetObjectDefn);
                }
            }
            else {
                targetObjectDefn = {
                    name: propertyId.objectName,
                    properties: {}
                };

                objectDefns.push({
                    selector: selector,
                    objects: [targetObjectDefn],
                });
            }

            targetObjectDefn.properties[propertyId.propertyName] = value;
        }

        function findWithMatchingSelector(objects: DataViewObjectDefinitionsForSelector[], selector: Selector): DataViewObjectDefinitionsForSelector {
            debug.assertValue(objects, 'objects');
            debug.assertAnyValue(selector, 'selector');

            for (let i = 0, len = objects.length; i < len; i++) {
                let object = objects[i];
                if (Selector.equals(object.selector, selector))
                    return object;
            }
        }

        function findExistingObject(objectDefns: DataViewNamedObjectDefinition[], objectName: string): DataViewNamedObjectDefinition {
            debug.assertValue(objectDefns, 'objectDefns');
            debug.assertValue(objectName, 'objectName');

            for (let i = 0, len = objectDefns.length; i < len; i++) {
                let objectDefn = objectDefns[i];

                if (objectDefn.name === objectName)
                    return objectDefn;
            }
        }
    }
}
