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

    /**
     * Formats the value using provided format expression
     * @param value - value to be formatted and converted to string.
     * @param format - format to be applied if the number shouldn't be abbreviated.
     * If the number should be abbreviated this string is checked for special characters like $ or % if any
     */
    export interface ICustomValueFormatter {
        (value: any, format?: string): string;
    }

    export interface ICustomValueColumnFormatter {
        (value: any, column: DataViewMetadataColumn, formatStringProp: DataViewObjectPropertyIdentifier): string;
    }

    export interface ValueFormatterOptions {
        /** The format string to use. */
        format?: string;

        /** The data value. */
        value?: any;

        /** The data value. */
        value2?: any;

        /** The number of ticks. */
        tickCount?: any;

        /** The display unit system to use */
        displayUnitSystemType?: DisplayUnitSystemType;

        /** True if we are formatting single values in isolation (e.g. card), as opposed to multiple values with a common base (e.g. chart axes) */
        formatSingleValues?: boolean;

        /** True if we want to trim off unnecessary zeroes after the decimal and remove a space before the % symbol */
        allowFormatBeautification?: boolean;

        /** Specifies the maximum number of decimal places to show*/
        precision?: number;

        /** Specifies the column type of the data value */
        columnType?: ValueType;
    }

    export interface IValueFormatter {
        format(value: any): string;
        displayUnit?: DisplayUnit;
        options?: ValueFormatterOptions;
    }

    /** Captures all locale-specific options used by the valueFormatter. */
    export interface ValueFormatterLocalizationOptions {
        null: string;
        true: string;
        false: string;
        NaN: string;
        infinity: string;
        negativeInfinity: string;

        /** Returns a beautified form the given format string. */
        beautify(format: string): string;

        /** Returns an object describing the given exponent in the current language. */
        describe(exponent: number): DisplayUnitSystemNames;
        restatementComma: string;
        restatementCompoundAnd: string;
        restatementCompoundOr: string;
    }

    export module valueFormatter {
        import StringExtensions = jsCommon.StringExtensions;
        const BeautifiedFormat: { [x: string]: string } = {
            '0.00 %;-0.00 %;0.00 %': 'Percentage',
            '0.0 %;-0.0 %;0.0 %': 'Percentage1',
        };

        const defaultLocalizedStrings = {
            'NullValue': '(Blank)',
            'BooleanTrue': 'True',
            'BooleanFalse': 'False',
            'NaNValue': 'NaN',
            'InfinityValue': '+Infinity',
            'NegativeInfinityValue': '-Infinity',
            'RestatementComma': '{0}, {1}',
            'RestatementCompoundAnd': '{0} and {1}',
            'RestatementCompoundOr': '{0} or {1}',
            'DisplayUnitSystem_EAuto_Title': 'Auto',
            'DisplayUnitSystem_E0_Title': 'None',
            'DisplayUnitSystem_E3_LabelFormat': '{0}K',
            'DisplayUnitSystem_E3_Title': 'Thousands',
            'DisplayUnitSystem_E6_LabelFormat': '{0}M',
            'DisplayUnitSystem_E6_Title': 'Millions',
            'DisplayUnitSystem_E9_LabelFormat': '{0}bn',
            'DisplayUnitSystem_E9_Title': 'Billions',
            'DisplayUnitSystem_E12_LabelFormat': '{0}T',
            'DisplayUnitSystem_E12_Title': 'Trillions',
            'Percentage': '#,0.##%',
            'Percentage1': '#,0.#%',
            'TableTotalLabel': 'Total',
            'Tooltip_HighlightedValueDisplayName': 'Highlighted',
            'Funnel_PercentOfFirst': 'Percent of first',
            'Funnel_PercentOfPrevious': 'Percent of previous',
            'Funnel_PercentOfFirst_Highlight': 'Percent of first (highlight)',
            'Funnel_PercentOfPrevious_Highlight': 'Percent of previous (highlight)',
            // Geotagging strings
            'GeotaggingString_Continent': 'continent',
            'GeotaggingString_Continents': 'continents',
            'GeotaggingString_Country': 'country',
            'GeotaggingString_Countries': 'countries',
            'GeotaggingString_State': 'state',
            'GeotaggingString_States': 'states',
            'GeotaggingString_City': 'city',
            'GeotaggingString_Cities': 'cities',
            'GeotaggingString_Town': 'town',
            'GeotaggingString_Towns': 'towns',
            'GeotaggingString_Province': 'province',
            'GeotaggingString_Provinces': 'provinces',
            'GeotaggingString_County': 'county',
            'GeotaggingString_Counties': 'counties',
            'GeotaggingString_Village': 'village',
            'GeotaggingString_Villages': 'villages',
            'GeotaggingString_Post': 'post',
            'GeotaggingString_Zip': 'zip',
            'GeotaggingString_Code': 'code',
            'GeotaggingString_Place': 'place',
            'GeotaggingString_Places': 'places',
            'GeotaggingString_Address': 'address',
            'GeotaggingString_Addresses': 'addresses',
            'GeotaggingString_Street': 'street',
            'GeotaggingString_Streets': 'streets',
            'GeotaggingString_Longitude': 'longitude',
            'GeotaggingString_Longitude_Short': 'lon',
            'GeotaggingString_Latitude': 'latitude',
            'GeotaggingString_Latitude_Short': 'lat',
            'GeotaggingString_PostalCode': 'postal code',
            'GeotaggingString_PostalCodes': 'postal codes',
            'GeotaggingString_ZipCode': 'zip code',
            'GeotaggingString_ZipCodes': 'zip codes',
            'GeotaggingString_Territory': 'territory',
            'GeotaggingString_Territories': 'territories',
        };

        function beautify(format: string): string {
            let key = BeautifiedFormat[format];
            if (key)
                return defaultLocalizedStrings[key] || format;
            return format;
        }

        function describeUnit(exponent: number): DisplayUnitSystemNames {
            let exponentLookup = (exponent === -1) ? 'Auto' : exponent.toString();

            let title: string = defaultLocalizedStrings["DisplayUnitSystem_E" + exponentLookup + "_Title"];
            let format: string = (exponent <= 0) ? '{0}' : defaultLocalizedStrings["DisplayUnitSystem_E" + exponentLookup + "_LabelFormat"];

            if (title || format)
                return { title: title, format: format };
        }

        export function getLocalizedString(stringId: string): string {
            return defaultLocalizedStrings[stringId];
        }

        // NOTE: Define default locale options, but these can be overriden by setLocaleOptions.
        let locale: ValueFormatterLocalizationOptions = {
            null: defaultLocalizedStrings['NullValue'],
            true: defaultLocalizedStrings['BooleanTrue'],
            false: defaultLocalizedStrings['BooleanFalse'],
            NaN: defaultLocalizedStrings['NaNValue'],
            infinity: defaultLocalizedStrings['InfinityValue'],
            negativeInfinity: defaultLocalizedStrings['NegativeInfinityValue'],
            beautify: format => beautify(format),
            describe: exponent => describeUnit(exponent),
            restatementComma: defaultLocalizedStrings['RestatementComma'],
            restatementCompoundAnd: defaultLocalizedStrings['RestatementCompoundAnd'],
            restatementCompoundOr: defaultLocalizedStrings['RestatementCompoundOr'],
        };

        const MaxScaledDecimalPlaces = 2;
        const MaxValueForDisplayUnitRounding = 1000;
        const MinIntegerValueForDisplayUnits = 10000;
        const MinPrecisionForDisplayUnits = 2;

        const DateTimeMetadataColumn: DataViewMetadataColumn = {
            displayName: '',
            type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.DateTime),
        };

        export function getFormatMetadata(format: string): powerbi.NumberFormat.NumericFormatMetadata {
            return powerbi.NumberFormat.getCustomFormatMetadata(format);
        }

        export function setLocaleOptions(options: ValueFormatterLocalizationOptions): void {
            debug.assertValue(options, 'options');

            locale = options;

            DefaultDisplayUnitSystem.reset();
            WholeUnitsDisplayUnitSystem.reset();
        }

        export function createDefaultFormatter(formatString: string, allowFormatBeautification: boolean = false): IValueFormatter {
            let formatBeaut: string = allowFormatBeautification ? locale.beautify(formatString) : formatString;
            return {
                format: function (value: any): string {
                    if (value == null)
                        return locale.null;

                    return formatCore(value, formatBeaut);
                }
            };
        }

        /** Creates an IValueFormatter to be used for a range of values. */
        export function create(options: ValueFormatterOptions): IValueFormatter {
            debug.assertValue(options, 'options');

            let format = !!options.allowFormatBeautification ? locale.beautify(options.format) : options.format;

            if (shouldUseNumericDisplayUnits(options)) {
                let displayUnitSystem = createDisplayUnitSystem(options.displayUnitSystemType);

                let singleValueFormattingMode = !!options.formatSingleValues;

                displayUnitSystem.update(Math.max(Math.abs(options.value || 0), Math.abs(options.value2 || 0)));

                let forcePrecision = options.precision != null;

                let decimals: number;

                if (forcePrecision)
                    decimals = -options.precision;
                else if (displayUnitSystem.displayUnit && displayUnitSystem.displayUnit.value > 1)
                    decimals = -MaxScaledDecimalPlaces;

                return {
                    format: function (value: any): string {
                        let formattedValue: string = getStringFormat(value, true /*nullsAreBlank*/);
                        if (!StringExtensions.isNullOrUndefinedOrWhiteSpaceString(formattedValue))
                            return formattedValue;

                        if (value && !displayUnitSystem.isScalingUnit() && Math.abs(value) < MaxValueForDisplayUnitRounding && !forcePrecision)
                            value = Double.roundToPrecision(value, Double.pow10(Double.getPrecision(value)));

                        return singleValueFormattingMode ?
                            displayUnitSystem.formatSingleValue(value, format, decimals, forcePrecision) :
                            displayUnitSystem.format(value, format, decimals, forcePrecision);
                    },
                    displayUnit: displayUnitSystem.displayUnit,
                    options: options
                };
            }

            if (shouldUseDateUnits(options.value, options.value2, options.tickCount)) {
                let unit = DateTimeSequence.getIntervalUnit(options.value /* minDate */, options.value2 /* maxDate */, options.tickCount);

                return {
                    format: function (value: any): string {
                        if (value == null)
                            return locale.null;

                        let formatString = formattingService.dateFormatString(unit);
                        return formatCore(value, formatString);
                    },
                    options: options
                };
            }

            return createDefaultFormatter(format);
        }

        export function format(value: any, format?: string, allowFormatBeautification?: boolean): string {
            if (value == null)
                return locale.null;

            return formatCore(
                value,
                !!allowFormatBeautification ? locale.beautify(format) : format);
        }

        function getValueFormat(value: any, columnType: ValueType): string {
            // If column type not defined or is not datetime
            // ...and the value is of time datetime,
            // then use the default date format string
            if ((!columnType || !columnType.dateTime) && value instanceof Date)
                return getFormatString(DateTimeMetadataColumn, null, false);
        }

        export function formatValueColumn(value: any, column: DataViewMetadataColumn, formatStringProp: DataViewObjectPropertyIdentifier): string {
            let format = getFormatString(column, formatStringProp);

            let valueFormat = getValueFormat(value, column.type);
            if (valueFormat)
                format = valueFormat;

            return formatCore(value, format);
        }

        function createDisplayUnitSystem(displayUnitSystemType?: DisplayUnitSystemType): DisplayUnitSystem {
            if (displayUnitSystemType == null)
                return new DefaultDisplayUnitSystem(locale.describe);

            switch (displayUnitSystemType) {
                case DisplayUnitSystemType.Default:
                    return new DefaultDisplayUnitSystem(locale.describe);
                case DisplayUnitSystemType.WholeUnits:
                    return new WholeUnitsDisplayUnitSystem(locale.describe);
                case DisplayUnitSystemType.Verbose:
                    return new NoDisplayUnitSystem();
                case DisplayUnitSystemType.DataLabels:
                    return new DataLabelsDisplayUnitSystem(locale.describe);
                default:
                    debug.assertFail('Unknown display unit system type');
                    return new DefaultDisplayUnitSystem(locale.describe);
            }
        }

        function shouldUseNumericDisplayUnits(options: ValueFormatterOptions): boolean {
            let value = options.value;
            let value2 = options.value2;
            let format = options.format;
            // For singleValue visuals like card, gauge we don't want to roundoff data to the nearest thousands so format the whole number / integers below 10K to not use display units
            if (options.formatSingleValues && format) {

                if (Math.abs(value) < MinIntegerValueForDisplayUnits) {

                    let isCustomFormat = !powerbi.NumberFormat.isStandardFormat(format);

                    if (isCustomFormat) {
                        let precision = powerbi.NumberFormat.getCustomFormatMetadata(format, true /*calculatePrecision*/).precision;

                        if (precision < MinPrecisionForDisplayUnits)
                            return false;
                    }
                    else if (Double.isInteger(value))
                        return false;
                }
            }

            if ((typeof value === 'number') || (typeof value2 === 'number')) {
                return true;
            }
        }

        function shouldUseDateUnits(value: any, value2?: any, tickCount?: number): boolean {
            // must check both value and value2 because we'll need to get an interval for date units
            return (value instanceof Date) && (value2 instanceof Date) && (tickCount !== undefined && tickCount !== null);
        }

        export function getFormatString(column: DataViewMetadataColumn, formatStringProperty: DataViewObjectPropertyIdentifier, suppressTypeFallback?: boolean): string {
            if (column) {
                if (formatStringProperty) {
                    let propertyValue = DataViewObjects.getValue<string>(column.objects, formatStringProperty);
                    if (propertyValue)
                        return propertyValue;
                }

                if (!suppressTypeFallback) {
                    let columnType = column.type;
                    if (columnType) {
                        if (columnType.dateTime)
                            return 'd';
                        if (columnType.integer)
                            return 'g';
                        if (columnType.numeric)
                            return '#,0.00';
                    }
                }
            }
        }

        function formatListCompound(strings: string[], conjunction: string): string {
            let result: string;

            if (!strings) {
                return null;
            }

            let length = strings.length;
            if (length > 0) {
                result = strings[0];
                let lastIndex = length - 1;
                for (let i = 1, len = lastIndex; i < len; i++) {
                    let value = strings[i];
                    result = StringExtensions.format(locale.restatementComma, result, value);
                }

                if (length > 1) {
                    let value = strings[lastIndex];
                    result = StringExtensions.format(conjunction, result, value);
                }
            }
            else {
                result = null;
            }

            return result;
        }

        /** The returned string will look like 'A, B, ..., and C'  */
        export function formatListAnd(strings: string[]): string {
            return formatListCompound(strings, locale.restatementCompoundAnd);
        }

        /** The returned string will look like 'A, B, ..., or C' */
        export function formatListOr(strings: string[]): string {
            return formatListCompound(strings, locale.restatementCompoundOr);
        }

        function formatCore(value: any, format: string): string {
            let formattedValue = getStringFormat(value, false /*nullsAreBlank*/);

            if (!StringExtensions.isNullOrUndefinedOrWhiteSpaceString(formattedValue))
                return formattedValue;

            return formattingService.formatValue(value, format);
        }

        function getStringFormat(value: any, nullsAreBlank: boolean): string {
            if (value == null && nullsAreBlank)
                return locale.null;

            if (value === true)
                return locale.true;

            if (value === false)
                return locale.false;

            if (typeof value === 'number' && isNaN(value))
                return locale.NaN;

            if (value === Number.NEGATIVE_INFINITY)
                return locale.negativeInfinity;

            if (value === Number.POSITIVE_INFINITY)
                return locale.infinity;

            return '';
        }

        export function getDisplayUnits(displayUnitSystemType: DisplayUnitSystemType): DisplayUnit[] {
            let displayUnitSystem = createDisplayUnitSystem(displayUnitSystemType);
            return displayUnitSystem.units;
        }
    }
}
