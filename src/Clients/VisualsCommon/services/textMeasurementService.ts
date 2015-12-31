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

module powerbi {
    export interface ITextMeasurer {
        (textElement: SVGTextElement): number;
    }

    export interface ITextAsSVGMeasurer {
        (textProperties: TextProperties): number;
    }

    export interface ITextTruncator {
        (properties: TextProperties, maxWidth: number): string;
    }

    export interface TextProperties {
        text?: string;
        fontFamily: string;
        fontSize: string;
        fontWeight?: string;
        fontStyle?: string;
        whiteSpace?: string;
    }

    interface CanvasContext {
        font: string;
        measureText(text: string): { width: number };
    }

    interface CanvasElement extends HTMLElement {
        getContext(name: string);
    }

    export module TextMeasurementService {
        const ellipsis = '…';
        const OverflowingText = jsCommon.CssConstants.createClassAndSelector('overflowingText');

        let spanElement: JQuery;
        let svgTextElement: D3.Selection;
        let canvasCtx: CanvasContext;

        /**
         * Idempotent function for adding the elements to the DOM. 
         */
        function ensureDOM(): void {
            if (spanElement)
                return;

            spanElement = $('<span/>');
            $('body').append(spanElement);
            //The style hides the svg element from the canvas, preventing canvas from scrolling down to show svg black square.
            svgTextElement = d3.select($('body').get(0))
                .append('svg')
                .style({
                    'height': '0px',
                    'width': '0px',
                    'position': 'absolute'
                })
                .append('text');
            canvasCtx = (<CanvasElement>$('<canvas/>').get(0)).getContext("2d");
        }
        
        /**
         * Removes spanElement from DOM.
         */
        export function removeSpanElement() {
            if (spanElement && spanElement.remove) {
                spanElement.remove();
            }

            spanElement = null;
        }

        /**
         * This method measures the width of the text with the given SVG text properties.
         * @param textProperties The text properties to use for text measurement.
         */
        export function measureSvgTextWidth(textProperties: TextProperties): number {
            debug.assertValue(textProperties, 'textProperties');

            ensureDOM();

            canvasCtx.font = textProperties.fontSize + ' ' + textProperties.fontFamily;
            return canvasCtx.measureText(textProperties.text).width;
        }

        /**
         * This method measures the height of the text with the given SVG text properties.
         * @param textProperties The text properties to use for text measurement.
         */
        export function measureSvgTextHeight(textProperties: TextProperties): number {
            debug.assertValue(textProperties, 'textProperties');

            ensureDOM();

            svgTextElement.style(null);
            svgTextElement
                .text(textProperties.text)
                .attr({
                    'visibility': 'hidden',
                    'font-family': textProperties.fontFamily,
                    'font-size': textProperties.fontSize,
                    'font-weight': textProperties.fontWeight,
                    'font-style': textProperties.fontStyle,
                    'white-space': textProperties.whiteSpace || 'nowrap'
                });

            // We're expecting the browser to give a synchronous measurement here
            // We're using SVGTextElement because it works across all browsers 
            return svgTextElement.node<SVGTextElement>().getBBox().height;
        }

        /**
         * This method estimates the height of the text with the given SVG text properties.
         * @param {TextProperties} textProperties - The text properties to use for text measurement
         */
        export function estimateSvgTextHeight(textProperties: TextProperties, tightFightForNumeric: boolean = false): number {
            debug.assertValue(textProperties, 'textProperties');

            let propertiesKey = textProperties.fontFamily + textProperties.fontSize;
            let height: number = ephemeralStorageService.getData(propertiesKey);

            if (height == null) {
                // To estimate we check the height of a particular character, once it is cached, subsequent
                // calls should always get the height from the cache (regardless of the text).
                let estimatedTextProperties: TextProperties = {
                    fontFamily: textProperties.fontFamily,
                    fontSize: textProperties.fontSize,
                    text: "M",
                };

                height = measureSvgTextHeight(estimatedTextProperties);
                ephemeralStorageService.setData(propertiesKey, height);
            }

            if (tightFightForNumeric) {
                height *= 0.7;
            }
            return height;
        }

        /**
         * This method measures the width of the svgElement.
         * @param svgElement The SVGTextElement to be measured.
         */
        export function measureSvgTextElementWidth(svgElement: SVGTextElement): number {
            debug.assertValue(svgElement, 'svgElement');
            return measureSvgTextWidth(getSvgMeasurementProperties(svgElement));
        }

        /**
         * This method fetches the text measurement properties of the given DOM element.
         * @param element The selector for the DOM Element.
         */
        export function getMeasurementProperties(element: JQuery): TextProperties {
            debug.assertValue(element, 'element');

            return {
                text: element.val() || element.text(),
                fontFamily: element.css('font-family'),
                fontSize: element.css('font-size'),
                fontWeight: element.css('font-weight'),
                fontStyle: element.css('font-style'),
                whiteSpace: element.css('white-space')
            };
        }

        /**
         * This method fetches the text measurement properties of the given SVG text element.
         * @param svgElement The SVGTextElement to be measured.
         */
        export function getSvgMeasurementProperties(svgElement: SVGTextElement): TextProperties {
            debug.assertValue(svgElement, 'svgElement');

            let style = window.getComputedStyle(svgElement, null);
            return {
                text: svgElement.textContent,
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle,
                whiteSpace: style.whiteSpace
            };
        }

        /**
         * This method returns the width of a div element.
         * @param element The div element.
         */
        export function getDivElementWidth(element: JQuery): string {
            debug.assert(element.is('div'), 'Given element is not a div type. Cannot get width');
            return getComputedStyle(element[0]).width;
        }

        /**
         * Compares labels text size to the available size and renders ellipses when the available size is smaller.
         * @param textProperties The text properties (including text content) to use for text measurement.
         * @param maxWidth The maximum width available for rendering the text.
        */
        export function getTailoredTextOrDefault(properties: TextProperties, maxWidth: number): string {
            debug.assertValue(properties, 'properties');
            debug.assertValue(properties.text, 'properties.text');

            ensureDOM();

            let strLength = properties.text.length;

            if (strLength === 0)
                return properties.text;

            let width = measureSvgTextWidth(properties);

            if (width < maxWidth)
                return properties.text;

            // Take the properties and apply them to svgTextElement
            // Then, do the binary search to figure out the substring we want
            // Set the substring on textElement argument
            let text = properties.text = ellipsis + properties.text;

            let min = 1;
            let max = text.length;
            let i = ellipsis.length;

            while (min <= max) {
                // num | 0 prefered to Math.floor(num) for performance benefits
                i = (min + max) / 2 | 0;

                properties.text = text.substr(0, i);
                width = measureSvgTextWidth(properties);

                if (maxWidth > width)
                    min = i + 1;
                else if (maxWidth < width)
                    max = i - 1;
                else
                    break;
            }

            // Since the search algorithm almost never finds an exact match,
            // it will pick one of the closest two, which could result in a
            // value bigger with than 'maxWidth' thus we need to go back by 
            // one to guarantee a smaller width than 'maxWidth'.
            properties.text = text.substr(0, i);
            width = measureSvgTextWidth(properties);
            if (width > maxWidth)
                i--;

            return text.substr(ellipsis.length, i - ellipsis.length) + ellipsis;
        }

        /**
         * Compares labels text size to the available size and renders ellipses when the available size is smaller.
         * @param textElement The SVGTextElement containing the text to render.
         * @param maxWidth The maximum width available for rendering the text.
        */
        export function svgEllipsis(textElement: SVGTextElement, maxWidth: number): void {
            debug.assertValue(textElement, 'textElement');

            let properties = getSvgMeasurementProperties(textElement);
            let originalText = properties.text;
            let tailoredText = getTailoredTextOrDefault(properties, maxWidth);

            if (originalText !== tailoredText) {
                textElement.textContent = tailoredText;
            }
        }

        /**
         * Word break textContent of <text> SVG element into <tspan>s
         * Each tspan will be the height of a single line of text
         * @param textElement - the SVGTextElement containing the text to wrap
         * @param maxWidth - the maximum width available
         * @param maxHeight - the maximum height available (defaults to single line)
         * @param linePadding - (optional) padding to add to line height
        */
        export function wordBreak(textElement: SVGTextElement, maxWidth: number, maxHeight: number, linePadding: number = 0): void {
            debug.assertValue(textElement, 'textElement');

            let properties = getSvgMeasurementProperties(textElement);
            let height = estimateSvgTextHeight(properties) + linePadding;
            let maxNumLines = Math.max(1, Math.floor(maxHeight / height));
            let node = d3.select(textElement);
            
            // Save y of parent textElement to apply as first tspan dy
            let firstDY = node.attr('y');

            // Store and clear text content
            let labelText = textElement.textContent;
            textElement.textContent = null;

            // Append a tspan for each word broken section
            let words = jsCommon.WordBreaker.splitByWidth(labelText, properties, measureSvgTextWidth, maxWidth, maxNumLines);
            for (let i = 0, ilen = words.length; i < ilen; i++) {
                properties.text = words[i];
                node
                    .append('tspan')
                    .attr({
                        'x': 0,
                        'dy': i === 0 ? firstDY : height,
                    })
                // Truncate
                    .text(getTailoredTextOrDefault(properties, maxWidth));
            }
        }

        /**
       * Word break textContent of span element into <span>s
       * Each span will be the height of a single line of text
       * @param textElement - the element containing the text to wrap
       * @param maxWidth - the maximum width available
       * @param maxHeight - the maximum height available (defaults to single line)
       * @param linePadding - (optional) padding to add to line height
      */
        export function wordBreakOverflowingText(textElement: any, maxWidth: number, maxHeight: number, linePadding: number = 0): void {
            debug.assertValue(textElement, 'textElement');

            let properties = getSvgMeasurementProperties(<SVGTextElement>textElement);
            let height = estimateSvgTextHeight(properties) + linePadding;
            let maxNumLines = Math.max(1, Math.floor(maxHeight / height));
            
            // Store and clear text content
            let labelText = textElement.textContent;
            textElement.textContent = null;

            // Append a span for each word broken section
            let words = jsCommon.WordBreaker.splitByWidth(labelText, properties, measureSvgTextWidth, maxWidth, maxNumLines);

            // splitByWidth() occasionally returns unnecessary empty strings, so get rid of them.
            // TODO: Fix splitByWidth.
            words = _.compact(words);

            let spanItem = d3.select(textElement)
                .selectAll(OverflowingText.selector)
                .data(words, (d: String) => $.inArray(d, words));

            spanItem
                .enter()
                .append("span")
                .classed(OverflowingText.class, true)
                .text((d: string) => d)
                .style("width", jsCommon.PixelConverter.toString(maxWidth));
        }
    }
}