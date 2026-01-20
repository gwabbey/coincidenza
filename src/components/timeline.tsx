"use client";
import {CSSProperties, useEffect, useRef, useState} from "react";
import {cn} from "@heroui/react";

interface TimelineItemProps {
    content: React.ReactNode;
}

interface TimelineProps {
    steps: TimelineItemProps[];
    active?: number;
    className?: string;
    color?: string;
}

const adjustBrightness = (hex: string, amount: number) => {
    let useHex = hex.replace("#", "");
    if (useHex.length === 3) {
        useHex = useHex.split("").map((c) => c + c).join("");
    }

    const num = parseInt(useHex, 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00ff) + amount;
    let b = (num & 0x00ff) + amount;

    r = Math.max(Math.min(255, r), 0);
    g = Math.max(Math.min(255, g), 0);
    b = Math.max(Math.min(255, b), 0);

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const Timeline = ({
                      steps, active = steps.length - 1, className, color = "#2D7FFF",
                  }: TimelineProps) => {
    const wholeNumber = Math.floor(active);
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
    const lineRef = useRef<HTMLDivElement | null>(null);
    const [fillHeight, setFillHeight] = useState(0);
    const [hasScrolled, setHasScrolled] = useState(false);
    const darkColor = adjustBrightness(color, 20);

    useEffect(() => {
        if (hasScrolled || stepRefs.current.length === 0) return;

        const currentStepIndex = Math.min(Math.floor(active), stepRefs.current.length - 1);
        const currentStep = stepRefs.current[currentStepIndex];

        if (currentStep && currentStepIndex > 0) {
            currentStep.scrollIntoView({
                behavior: "smooth", block: "center",
            });
            setHasScrolled(true);
        }
    }, [active, hasScrolled]);

    useEffect(() => {
        if (!lineRef.current || stepRefs.current.length === 0) return;

        if (wholeNumber < 0) {
            setFillHeight(0);
            return;
        }

        const container = lineRef.current;
        const stepOffsets = stepRefs.current.map((step) => {
            if (!step) return 0;
            const dot = step.querySelector(".relative.z-10") as HTMLElement;
            if (!dot) return step.offsetTop;

            const containerRect = container.getBoundingClientRect();
            const dotRect = dot.getBoundingClientRect();

            return (dotRect.top + dotRect.height / 2 - containerRect.top + container.scrollTop);
        });

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

    return (<div
        className="relative flex flex-col"
        style={{
            "--active-color": color, "--active-color-dark": darkColor,
        } as CSSProperties}
    >
        <div className={cn("relative flex flex-col gap-8", className)}>
            {steps.map((step, index) => {
                const isActive = index <= wholeNumber

                return (<div
                    key={index}
                    className="relative flex items-start gap-4"
                    data-step={index}
                    ref={el => {
                        stepRefs.current[index] = el
                    }}
                >
                    <div className="relative z-10">
                        <div
                            className={cn("flex justify-center items-center after:shadow-small outline-none bg-(--active-color) w-4 h-4 after:w-3 after:h-3 rounded-full after:rounded-full top-1/2 ring-transparent border-0 after:transition-all shadow-small transition-colors", isActive ? "after:bg-(--active-color-dark)" : "after:bg-white")}
                        />
                    </div>

                    <div className="leading-none max-w-lg w-full">{step.content}</div>
                </div>)
            })}

            <div
                ref={lineRef}
                className="absolute left-2 top-0 h-[calc(100%-2rem)] w-1 dark:bg-gray-500 bg-gray-400 transition-background -translate-x-1/2"
            >
                <div
                    className="absolute w-full transition-all duration-1000"
                    style={{
                        height: `${fillHeight}%`, backgroundColor: color,
                    }}
                />
            </div>
        </div>
    </div>);
};

export default Timeline;