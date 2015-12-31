﻿ /*
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
    export module outline {
        export const none: string = 'None';
        export const bottomOnly: string = 'BottomOnly';
        export const topOnly: string = 'TopOnly';
        export const leftOnly: string = 'LeftOnly';
        export const rightOnly: string = 'RightOnly';
        export const topBottom: string = 'TopBottom';
        export const leftRight: string = 'LeftRight';
        export const frame: string = 'Frame';

        export const type: IEnumType = createEnumType([
            { value: none, displayName: resources => resources.get('Visual_Outline_none') },
            { value: bottomOnly, displayName: resources => resources.get('Visual_Outline_bottom_only') },
            { value: topOnly, displayName: resources => resources.get('Visual_Outline_top_only') },
            { value: leftOnly, displayName: resources => resources.get('Visual_Outline_LeftOnly') },
            { value: rightOnly, displayName: resources => resources.get('Visual_Outline_RightOnly') },
            { value: topBottom, displayName: resources => resources.get('Visual_Outline_top_Bottom') },
            { value: leftRight, displayName: resources => resources.get('Visual_Outline_leftRight') },
            { value: frame, displayName: resources => resources.get('Visual_Outline_frame') }
        ]);
    }
}