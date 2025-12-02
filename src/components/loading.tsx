"use client"
import {Spinner} from "@heroui/react";

export default function Loading() {
    return (<div className="flex-col py-4">
        <Spinner color="default" size="lg" />
        <p className="text-center text-foreground-500 text-lg">caricamento in corso...</p>
    </div>)
}