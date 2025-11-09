"use client";

import {Modal, ModalBody, ModalContent, ModalHeader} from "@heroui/react";

type RouteModalProps = {
    open: boolean; action: (isOpen: boolean) => void; title: string; children: React.ReactNode;
};

export const RouteModal = ({open, action, title, children}: RouteModalProps) => (
    <Modal isOpen={open} onOpenChange={action} backdrop="blur" scrollBehavior="inside" placement="center">
        <ModalContent className="pb-2">
            <ModalHeader className="flex flex-col gap-1 pb-0">{title}</ModalHeader>
            <ModalBody>{children}</ModalBody>
        </ModalContent>
    </Modal>);