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

/// <reference path="../_references.ts"/>

module powerbi {
    import StringExtensions = jsCommon.StringExtensions;

    const maxExponent = 24;
    const defaultScientificBigNumbersBoundary = 1E15;
    const scientificSmallNumbersBoundary = 1E-4;

    export class DisplayUnit {
        // Fields
        public value: number;
        public title: string;
        public labelFormat: string;
        public applicableRangeMin: number;
        public applicableRangeMax: number;

        // Methods
        public project(value: number): number {
            if (this.value) {
                return value / this.value;
            } else {
                return value;
            }
        }

        public reverseProject(value: number): number {
            if (this.value) {
                return value * this.value;
            } else {
                return value;
            }
        }

        public isApplicableTo(value: number): boolean {
            value = Math.abs(value);
            let precision = Double.getPrecision(value, 3);
            return Double.greaterOrEqualWithPrecision(value, this.applicableRangeMin, precision) && Double.lessWithPrecision(value, this.applicableRangeMax, precision);
        }

        public isScaling(): boolean {
            return this.value > 1;
        }
    }

    export class DisplayUnitSystem {

        // Constants
        static UNSUPPORTED_FORMATS = /^(p\d*)|(.*\%)|(e\d*)$/i;
        static NUMBER_FORMAT = /#|0/;
        static SUPPORTED_SCIENTIFIC_FORMATS = /^((0*\.*\,*#*-*)*|g)*$/i;
        static DEFAULT_SCIENTIFIC_FORMAT = "0.######E+0";
        static AUTO_DISPLAYUNIT_VALUE = 0;
        static NONE_DISPLAYUNIT_VALUE = 1;

        // Fields
        public units: DisplayUnit[];
        public displayUnit: DisplayUnit;
        private unitBaseValue: number;

        // Constructor
        constructor(units?: DisplayUnit[]) {
            this.units = units ? units : [];
        }

        // Properties
        public get title(): string {
            return this.displayUnit ? this.displayUnit.title : undefined;
        }

        // Methods
        public update(value: number): void {
            if (value === undefined)
                return;

            this.unitBaseValue = value;
            this.displayUnit = this.findApplicableDisplayUnit(value);
        }

        private findApplicableDisplayUnit(value: number): DisplayUnit {
            for (let unit of this.units) {
                if (unit.isApplicableTo(value))
                    return unit;
            }

            return undefined;
        }

        public format(value: number, format: string, decimals?: number, trailingZeros?: boolean ): string {

            if (this.isFormatSupported(format)) {
                if (this.hasScientitifcFormat(format)) {
                    return this.formatHelper(value, value, '', format, decimals, trailingZeros);
                }
                if (this.isScalingUnit() && this.shouldRespectScalingUnit(format)) {
                    let projectedValue = this.displayUnit.project(value);
                    let nonScientificFormat = (trailingZeros)
                        ? DisplayUnitSystem.getNonScientificFormatWithPrecision(this.displayUnit.labelFormat, decimals)
                        : this.displayUnit.labelFormat;
                    return this.formatHelper(value, projectedValue, nonScientificFormat, format, decimals, trailingZeros);
                }
                if (decimals != null) {
                    if (trailingZeros && format && DisplayUnitSystem.NUMBER_FORMAT.test(format)) {
                        let formatWithPrecision = DisplayUnitSystem.getFormatWithPrecision(decimals);
                        //Using the regex below we can maintain the original format (with/without dot, $ etc.) while forcing precision.
                        let regex = /^[a-zA-Z0-9- ]*$/.test(format) ?/.0*/g:/0\.0*/g;
                        format = format.replace(regex, formatWithPrecision);
                        let decimalsForFormatting = this.getNumberOfDecimalsForFormatting(format, decimals);
                        return this.formatHelper(value, value, '', format, decimalsForFormatting, trailingZeros);
                    }
                    if (trailingZeros) {
                        let nonScientificFormat = DisplayUnitSystem.getNonScientificFormatWithPrecision('{0}', decimals);
                        return this.formatHelper(value, value, nonScientificFormat, format, decimals, trailingZeros);
                    }
                    return this.formatHelper(value, value, '', format, decimals, trailingZeros);
                }
            }

            format = this.removeFractionIfNecessary(format);
            return formattingService.formatValue(value, format);
        }

        public isFormatSupported(format: string): boolean {
            return !DisplayUnitSystem.UNSUPPORTED_FORMATS.test(format);
        }

        public getNumberOfDecimalsForFormatting(format: string, decimals?: number) {
            return decimals;
        }

        public isScalingUnit(): boolean {
            return this.displayUnit && this.displayUnit.isScaling();
        }

        public shouldRespectScalingUnit(format: string): boolean{
            return true;
        }

        private formatHelper(value: number, projectedValue: number, nonScientificFormat: string, format: string, decimals?: number, trailingZeros?: boolean) {
            let precision = (decimals != null) ? Double.pow10(decimals) : Double.getPrecision(value);
            
            let x = Double.roundToPrecision(projectedValue, precision);

            if (format && !formattingService.isStandardNumberFormat(format))
                return formattingService.formatNumberWithCustomOverride(x, format, nonScientificFormat);

            let textFormat = trailingZeros ? DisplayUnitSystem.getFormatWithPrecision(decimals) : 'G';
            let text = formattingService.formatValue(x, textFormat);
            return formattingService.format(nonScientificFormat, [text]);
        }

        private static getNonScientificFormatWithPrecision(baseFormat: string, decimals: number): string {
            if (!decimals || baseFormat === undefined)
                return baseFormat;

            let newFormat = "{0:" + DisplayUnitSystem.getFormatWithPrecision(decimals) + "}";

            return baseFormat.replace("{0}", newFormat);
        }

        private static getFormatWithPrecision(decimals?: number): string {
            if (decimals == null) return 'G';
            return ",0." + StringExtensions.repeat('0',Math.abs(decimals));
        }

        /** Formats a single value by choosing an appropriate base for the DisplayUnitSystem before formatting. */
        public formatSingleValue(value: number, format: string, decimals?: number, trailingZeros?: boolean): string {
            // Change unit base to a value appropriate for this value
            this.update(this.shouldUseValuePrecision(value) ? Double.getPrecision(value, 8) : value);

            return this.format(value, format, decimals, trailingZeros);
        }

        private shouldUseValuePrecision(value: number): boolean {
            if (this.units.length === 0)
                return true;

            // Check if the value is big enough to have a valid unit by checking against the smallest unit (that it's value bigger than 1).
            let applicableRangeMin: number = 0;
            for (let i = 0; i < this.units.length; i++) {
                if (this.units[i].isScaling()) {
                    applicableRangeMin = this.units[i].applicableRangeMin;
                    break;
                }
            }
            
            return Math.abs(value) < applicableRangeMin;
        }

        private removeFractionIfNecessary(formatString: string): string {
            if (formatString) {
                if (Math.abs(this.unitBaseValue) >= 0.01) {
                    formatString = formatString.replace(/^(p\d*)$/i, "p0");
                }
                if (Math.abs(this.unitBaseValue) >= 1.0) {
                    formatString = formatString.replace(/[#0]\.[#0]+$/, "0"); // Custom number format with hash/zero fraction
                    formatString = formatString.replace(/^(n\d*)$/i, "n0");
                    formatString = formatString.replace(/^(f\d*)$/i, "f0");
                    formatString = formatString.replace(/^(c\d*)$/i, "c0");
                }
            }
            return formatString;
        }

        protected isScientific(value: number): boolean {
            return value < - defaultScientificBigNumbersBoundary || value > defaultScientificBigNumbersBoundary ||
                (-scientificSmallNumbersBoundary < value && value < scientificSmallNumbersBoundary && value !== 0);
        }

        protected hasScientitifcFormat(format: string): boolean {
            return format && format.toUpperCase().indexOf("E") !== -1;
        }

        protected supportsScientificFormat(format: string): boolean {
            if (format)
                return DisplayUnitSystem.SUPPORTED_SCIENTIFIC_FORMATS.test(format);

            return true;
        }

        protected shouldFallbackToScientific(value: number, format: string) {
            return !this.hasScientitifcFormat(format)
                && this.supportsScientificFormat(format)
                && this.isScientific(value);
        }
    }

    /** Provides a unit system that is defined by formatting in the model, and is suitable for visualizations shown in single number visuals in explore mode. */
    export class NoDisplayUnitSystem extends DisplayUnitSystem {
        // Constructor
        constructor() {
            super([]);
        }
    }

    /** Provides a unit system that creates a more concise format for displaying values. This is suitable for most of the cases where
        we are showing values (chart axes) and as such it is the default unit system. */
    export class DefaultDisplayUnitSystem extends DisplayUnitSystem {
        private static units: DisplayUnit[];

        // Constructor
        constructor(unitLookup: (exponent: number) => DisplayUnitSystemNames) {
            super(DefaultDisplayUnitSystem.getUnits(unitLookup));
        }

        // Methods
        public format(data: number, format: string, decimals?: number, trailingZeros?: boolean): string {
            // Use scientific format outside of the range
            if (this.isFormatSupported(format) && this.shouldFallbackToScientific(data, format)) {
                if (trailingZeros && decimals)
                    format = "0." + StringExtensions.repeat('0', Math.abs(decimals)) + "E+0";
                else
                    format = DisplayUnitSystem.DEFAULT_SCIENTIFIC_FORMAT;
            }

            return super.format(data, format, decimals, trailingZeros);
        }

        public static reset(): void {
            DefaultDisplayUnitSystem.units = null;
        }

        private static getUnits(unitLookup: (exponent: number) => DisplayUnitSystemNames): DisplayUnit[] {
            if (!DefaultDisplayUnitSystem.units) {
                DefaultDisplayUnitSystem.units = createDisplayUnits(unitLookup, (value: number, previousUnitValue: number, min: number) => {
                    // When dealing with millions/billions/trillions we need to switch to millions earlier: for example instead of showing 100K 200K 300K we should show 0.1M 0.2M 0.3M etc
                    if (value - previousUnitValue >= 1000) {
                        return value / 10;
                    }

                    return min;
                });

                // Ensure last unit has max of infinity
                DefaultDisplayUnitSystem.units[DefaultDisplayUnitSystem.units.length - 1].applicableRangeMax = Infinity;
            }
            return DefaultDisplayUnitSystem.units;
        }
    }

    /** Provides a unit system that creates a more concise format for displaying values, but only allows showing a unit if we have at least
        one of those units (e.g. 0.9M is not allowed since it's less than 1 million). This is suitable for cases such as dashboard tiles
        where we have restricted space but do not want to show partial units. */
    export class WholeUnitsDisplayUnitSystem extends DisplayUnitSystem {
        private static units: DisplayUnit[];

        // Constructor
        constructor(unitLookup: (exponent: number) => DisplayUnitSystemNames) {
            super(WholeUnitsDisplayUnitSystem.getUnits(unitLookup));
        }

        public static reset(): void {
            WholeUnitsDisplayUnitSystem.units = null;
        }

        private static getUnits(unitLookup: (exponent: number) => DisplayUnitSystemNames): DisplayUnit[] {
            if (!WholeUnitsDisplayUnitSystem.units) {
                WholeUnitsDisplayUnitSystem.units = createDisplayUnits(unitLookup);
                
                // Ensure last unit has max of infinity
                WholeUnitsDisplayUnitSystem.units[WholeUnitsDisplayUnitSystem.units.length - 1].applicableRangeMax = Infinity;
            }

            return WholeUnitsDisplayUnitSystem.units;
        }

        public format(data: number, format: string, decimals?: number, trailingZeros?: boolean): string {
            // Use scientific format outside of the range
            if (this.isFormatSupported(format) && this.shouldFallbackToScientific(data, format)) {
                if (trailingZeros && decimals)
                    format = "0." + StringExtensions.repeat('0', Math.abs(decimals)) + "E+0";
                else
                    format = DisplayUnitSystem.DEFAULT_SCIENTIFIC_FORMAT;
            }

            return super.format(data, format, decimals, trailingZeros);
        }
    }

    export class DataLabelsDisplayUnitSystem extends DisplayUnitSystem {

        // Constants
        static UNSUPPORTED_FORMATS = /^(e\d*)$/i;
        static PERCENTAGE_FORMAT = '%';

        private static units: DisplayUnit[];

        constructor(unitLookup: (exponent: number) => DisplayUnitSystemNames) {
            super(DataLabelsDisplayUnitSystem.getUnits(unitLookup));
        }

        public isFormatSupported(format: string): boolean {
            return !DataLabelsDisplayUnitSystem.UNSUPPORTED_FORMATS.test(format);
        }

        public getNumberOfDecimalsForFormatting(format: string, decimals?: number) {
            if (format.indexOf(DataLabelsDisplayUnitSystem.PERCENTAGE_FORMAT) >= 0)
                return decimals -= 2;
        }

        public shouldRespectScalingUnit(format: string): boolean {
            return (!format || format.indexOf(DataLabelsDisplayUnitSystem.PERCENTAGE_FORMAT) < 0);
        }

        private static getUnits(unitLookup: (exponent: number) => DisplayUnitSystemNames): DisplayUnit[] {
            if (!DataLabelsDisplayUnitSystem.units) {
                let units = [];
                let adjustMinBasedOnPreviousUnit = (value: number, previousUnitValue: number, min: number): number => {
                    // Never returns true, we are always ignoring
                    // We do not early switch (e.g. 100K instead of 0.1M)
                    // Intended? If so, remove this function, otherwise, remove if statement
                    if (value === -1)
                        if (value - previousUnitValue >= 1000) {
                            return value / 10;
                        }
                    return min;
                };

                //Add Auto & None
                let names = unitLookup(-1);
                addUnitIfNonEmpty(units, DisplayUnitSystem.AUTO_DISPLAYUNIT_VALUE, names.title, names.format, adjustMinBasedOnPreviousUnit);

                names = unitLookup(0);
                addUnitIfNonEmpty(units, DisplayUnitSystem.NONE_DISPLAYUNIT_VALUE, names.title, names.format, adjustMinBasedOnPreviousUnit);

                //add normal units
                DataLabelsDisplayUnitSystem.units = units.concat(createDisplayUnits(unitLookup, adjustMinBasedOnPreviousUnit));

                // Ensure last unit has max of infinity
                DataLabelsDisplayUnitSystem.units[DataLabelsDisplayUnitSystem.units.length - 1].applicableRangeMax = Infinity;
            }
            return DataLabelsDisplayUnitSystem.units;
        }

        protected shouldFallbackToScientific(value: number, format: string) {
            if (!this.displayUnit)
                return super.shouldFallbackToScientific(value, format);
            else
                // Allow auto display unit to pass through
                return this.displayUnit.value !== DisplayUnitSystem.AUTO_DISPLAYUNIT_VALUE
                    && super.shouldFallbackToScientific(value, format);
        }

        public format(data: number, format: string, decimals?: number, trailingZeros?: boolean): string {
            // Use scientific format outside of the range
            if (this.shouldFallbackToScientific(data, format)) {
                if (trailingZeros && decimals)
                    format = "0." + StringExtensions.repeat('0', Math.abs(decimals)) + "E+0";
                else
                    format = '0E+0';
            }

            return super.format(data, format, decimals, trailingZeros);
        }
    }

    export interface DisplayUnitSystemNames {
        title: string;
        format: string;
    }

    function createDisplayUnits(unitLookup: (exponent: number) => DisplayUnitSystemNames, adjustMinBasedOnPreviousUnit?: (value: number, previousUnitValue: number, min: number) => number) {
        let units = [];
        for (let i = 3; i < maxExponent; i++) {
            let names = unitLookup(i);
            if (names)
                addUnitIfNonEmpty(units, Double.pow10(i), names.title, names.format, adjustMinBasedOnPreviousUnit);
        }

        return units;
    }

    function addUnitIfNonEmpty(
        units: DisplayUnit[],
        value: number,
        title: string,
        labelFormat: string,
        adjustMinBasedOnPreviousUnit?: (value: number, previousUnitValue: number, min: number) => number): void {
        if (title || labelFormat) {
            let min = value;

            if (units.length > 0) {
                let previousUnit = units[units.length - 1];

                if (adjustMinBasedOnPreviousUnit)
                    min = adjustMinBasedOnPreviousUnit(value, previousUnit.value, min);

                previousUnit.applicableRangeMax = min;
            }
            let unit = new DisplayUnit();
            unit.value = value;
            unit.applicableRangeMin = min;
            unit.applicableRangeMax = min * 1000;
            unit.title = title;
            unit.labelFormat = labelFormat;
            units.push(unit);
        }
    }
}