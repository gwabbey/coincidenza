"use client";

import {Modal, ModalBody, ModalContent, ModalHeader} from "@heroui/react";

type RouteModalProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    title: string;
    children: React.ReactNode;
};

export const RouteModal = ({isOpen, onOpenChange, title, children}: RouteModalProps) => (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur" scrollBehavior="inside" placement="center">
        <ModalContent className="pb-2">
            <ModalHeader className="flex flex-col gap-1 pb-0">{title}</ModalHeader>
            <ModalBody>{children}</ModalBody>
        </ModalContent>
    </Modal>
);