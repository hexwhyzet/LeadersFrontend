import * as React from 'react';
import {Range, getTrackBackground} from 'react-range';

const STEP = 1;
const MIN = 1;

const RangeInput: React.FC<{ rtl: boolean, defaultValue: Number, onChange: Function, maxValue: Number }> = ({rtl, defaultValue, onChange, maxValue}) => {
    const [values, setValues] = React.useState([defaultValue])
    return (
        <div
            style={{
                paddingTop: '50px',
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap'
            }}
        >
            <Range
                values={values}
                step={STEP}
                min={MIN}
                max={maxValue}
                rtl={rtl}
                onChange={
                    (values) => {
                        setValues(values);
                        onChange(values[0]);
                    }
                }
                renderTrack={({props, children}) => (
                    <div
                        onMouseDown={props.onMouseDown}
                        onTouchStart={props.onTouchStart}
                        style={{
                            ...props.style,
                            height: '36px',
                            display: 'flex',
                            width: '400px'
                        }}
                    >
                        <div
                            ref={props.ref}
                            style={{
                                height: '6px',
                                width: '100%',
                                borderRadius: '4px',
                                background: getTrackBackground({
                                    values,
                                    colors: ['#ffffff', '#828282'],
                                    min: MIN,
                                    max: maxValue,
                                    rtl
                                }),
                                alignSelf: 'center'
                            }}
                        >
                            {children}
                        </div>
                    </div>
                )}
                renderThumb={({props, isDragged}) => (
                    <div
                        {...props}
                        style={{
                            ...props.style,
                            height: '30px',
                            width: '30px',
                            borderRadius: '50%',
                            backgroundColor: '#FFF',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            outline: 'none',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                top: '-35px',
                                color: '#ffffff',
                                fontWeight: 'bold',
                                fontSize: '1.15em',
                            }}
                        >
                            {values[0].toFixed(0)}
                        </div>
                        <div
                            style={{
                                height: '12px',
                                width: '12px',
                                borderRadius: '50%',
                                transitionDuration: '0.25s',
                                backgroundColor: isDragged ? '#000' : '#ccc'
                            }}
                        />
                    </div>
                )}
            />
        </div>
    );
};

export default RangeInput;