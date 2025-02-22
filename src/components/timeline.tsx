"use client";
import { useEffect, useRef, useState } from "react";

interface TimelineItemProps {
    content: React.ReactNode
}

interface TimelineProps {
    steps: TimelineItemProps[]
    active?: number
}

const Timeline = ({ steps, active = steps.length - 1 }: TimelineProps) => {
    const wholeNumber = Math.floor(active)
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
    const lineRef = useRef<HTMLDivElement | null>(null);
    const [fillHeight, setFillHeight] = useState(0);

    useEffect(() => {
        if (!lineRef.current || stepRefs.current.length === 0) return;

        if (wholeNumber < 0) {
            setFillHeight(0);
            return;
        }

        const container = lineRef.current;
        const stepOffsets = stepRefs.current.map(step => step?.offsetTop ?? 0);

        const currentStepIndex = Math.min(Math.floor(active), stepOffsets.length - 1);
        const nextStepIndex = Math.min(currentStepIndex + 1, stepOffsets.length - 1);
        const currentOffset = stepOffsets[currentStepIndex];
        const nextOffset = stepOffsets[nextStepIndex];

        const totalHeight = container.clientHeight;
        let filledHeight = currentOffset;

        if (active % 1 > 0) {
            filledHeight += (nextOffset - currentOffset) * (active % 1);
        }

        setFillHeight((filledHeight / totalHeight) * 100);
    }, [active, steps.length]);

    return (
        <div className="relative flex flex-col">
            <div className="relative flex flex-col gap-8">
                {steps.map((step, index) => {
                    const isActive = index <= wholeNumber

                    return (
                        <div
                            key={index}
                            className="relative flex items-start gap-4"
                            data-step={index}
                            ref={el => { stepRefs.current[index] = el }}
                        >
                            <div className="relative z-10">
                                <div
                                    className={`flex justify-center items-center after:shadow-small outline-none w-4 h-4 after:w-3 after:h-3 rounded-full after:rounded-full bg-primary top-1/2 ring-transparent border-0 after:transition-all shadow-small ${isActive ? "after:bg-blue-500" : "bg-gray-200 after:bg-white"}`}
                                />
                            </div>

                            <div className="leading-none">{step.content}</div>
                        </div>
                    )
                })}

                <div
                    ref={lineRef}
                    className="absolute left-2 top-0 h-[calc(100%-2rem)] w-1 bg-gray-500 -translate-x-1/2"
                >
                    <div
                        className="absolute w-full bg-blue-500 transition-all duration-1000"
                        style={{ height: `${fillHeight}%` }}
                    />
                </div>
            </div>
        </div>
    )
}

export default Timeline;