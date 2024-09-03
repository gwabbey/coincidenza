'use client';
import {AnimatePresence} from "framer-motion";
import React from "react";

export const MotionWrapper = ({children}: { children: any }) => {
    return (
        <AnimatePresence>{children}</AnimatePresence>
    );
}