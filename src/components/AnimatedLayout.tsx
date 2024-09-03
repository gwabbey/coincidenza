'use client'
import {motion} from "framer-motion";
import {useEffect, useState} from "react";

const AnimatedLayout = ({children, isLoaded}: { children: any, isLoaded: boolean }) => {
    const [clientLoaded, setClientLoaded] = useState(false);

    useEffect(() => {
        setClientLoaded(isLoaded);
    }, [isLoaded]);

    const containerVariants = {
        centered: {y: "calc(100vh/3)"},
        top: {y: 32}
    };

    return (
        <motion.div
            style={{
                gap: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                height: "100%"
            }}
            initial="centered"
            animate={clientLoaded ? "top" : "centered"}
            variants={containerVariants}
            transition={{duration: 2, type: "spring", bounce: 0.25}}
        >
            {children}
        </motion.div>
    );
};

export default AnimatedLayout;