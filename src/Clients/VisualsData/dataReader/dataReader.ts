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
    /** Represents a data reader. */
    export interface IDataReader {
        /** Executes a query, with a promise of completion.  The response object should be compatible with the transform implementation. */
        execute?(options: DataReaderExecutionOptions): RejectablePromise2<DataReaderData, IClientError>;

        /** Transforms the given data into a DataView.  When this function is not specified, the data is put on a property on the DataView. */
        transform?(obj: DataReaderData): DataReaderTransformResult;

        /** Stops all future communication and reject and pending communication  */
        stopCommunication?(): void;

        /** Resumes communication which enables future requests */
        resumeCommunication?(): void;

        /** Clear cache */
        clearCache?(dataSource: DataReaderDataSource): void;

        /** rewriteCacheEntries */
        rewriteCacheEntries?(dataSource: DataReaderDataSource, rewriter: DataReaderCacheRewriter): void;

        /** Sets the result into the local cache */
        setLocalCacheResult?(options: DataReaderExecutionOptions, dataAsObject: DataReaderData): void;
    }

    /** Represents a query generator. */
    export interface IQueryGenerator {
        /** Query generation function to convert a (prototype) SemanticQuery to a runnable query command. */
        execute(options: QueryGeneratorOptions): QueryGeneratorResult;
    }

    export interface IFederatedConceptualSchemaReader {
        /** Executes a request for conceptual schema with a promise of completion. */
        execute(options: FederatedConceptualSchemaReaderOptions): IPromise<FederatedConceptualSchemaResponse>;

        /** Transforms the given data into a FederatedConceptualSchema. */
        transform(obj: FederatedConceptualSchemaResponse): SchemaReaderTransformResult;
    }

    /** Represents a custom data reader plugin, to be registered in the powerbi.data.plugins object. */
    export interface IDataReaderPlugin {
        /** The name of this plugin. */
        name: string;
        
        /** Factory method for the IDataReader. */
        reader(hostServices: IDataReaderHostServices): IDataReader;

        /** Factory method for the IQueryGenerator. */
        queryGenerator?(): IQueryGenerator;

        /** Factory method for the IFederatedConceptualSchemaReader. */
        schemaReader?(hostServices: IDataReaderHostServices): IFederatedConceptualSchemaReader;
    }

    export interface QueryGeneratorOptions {
        query: SemanticQuery;
        mappings: CompiledDataViewMapping[];
        additionalProjections?: AdditionalQueryProjection[];
        highlightFilter?: SemanticFilter;
        restartToken?: RestartToken;
    }

    export interface AdditionalQueryProjection {
        queryName: string;
        selector: Selector;
    }

    export interface QueryGeneratorResult {
        command: DataReaderQueryCommand;
        splits?: DataViewSplitTransform[];
    }

    export interface DataReaderTransformResult {
        dataView?: DataView;
        restartToken?: RestartToken;
        error?: IClientError;
        warning?: IClientWarning;
    }

    export interface RestartToken {
        // This interface is intentionally empty, as plugins define their own data structure.
    }

    export interface DataReaderQueryCommand {
        // This interface is intentionally empty, as plugins define their own data structure.
    }

    /** Represents a query command defined by an IDataReader. */
    export interface DataReaderCommand {
        // This interface is intentionally empty, as plugins define their own data structure.
    }

    /** Represents a data source defined by an IDataReader. */
    export interface DataReaderDataSource {
        // This interface is intentionally empty, as plugins define their own data structure.
    }

    /** Represents arbitrary data defined by an IDataReader. */
    export interface DataReaderData {
        // This interface is intentionally empty, as plugins define their own data structure.
    }

    /** Represents cacheRewriter that will rewrite the cache of reader as defined by an IDataReader. */
    export interface DataReaderCacheRewriter {
        // This interface is intentionally empty, as plugins define their own data structure.
    }

    export interface DataReaderExecutionOptions {
        dataSource?: DataReaderDataSource;
        command: DataReaderCommand;
        allowCache?: boolean;
        cacheResponseOnServer?: boolean;
    }

    export interface FederatedConceptualSchemaReaderOptions {
        dataSources: ConceptualSchemaReaderDataSource[];
    }

    export interface ConceptualSchemaReaderDataSource {
        id: number;

        /** Specifies the name used in Semantic Queries to reference this DataSource. */
        name: string;
    }

    export interface FederatedConceptualSchemaResponse {
        data: FederatedConceptualSchemaData;
    }

    export interface FederatedConceptualSchemaData {
        // This interface is intentionally empty, as plugins define their own data structure.
    }

    export interface SchemaReaderTransformResult {
        schema: FederatedConceptualSchema;
        error?: SchemaReaderError;
    }

    // Defect 5858607, consider removing serviceError and only have IClientError to be more consistent with IDataProxy.
    export interface SchemaReaderError {
        requestId?: string;
        serviceError?: ServiceError;
        clientError: IClientError;
    }

    export interface IDataReaderHostServices {
        promiseFactory(): IPromiseFactory;
    }
}
