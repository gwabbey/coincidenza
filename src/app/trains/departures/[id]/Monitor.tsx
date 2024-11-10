'use client';
import {Table} from '@mantine/core';
import Image from "next/image";

export function Monitor({monitor}: { monitor: any }) {
    const rows = monitor.trains.map((train: any, index: number) => (<Table.Tr key={index}>
        <Table.Td tt="capitalize">{train.company.toLowerCase()}</Table.Td>
        <Table.Td w={24}>
            {train.category && (
                <Image src={train.category.trim()} width={50} height={50} style={{
                    filter: "grayscale(100%)",
                    width: "100%",
                    height: "100%",
                }} alt="Treno" />
            )}
        </Table.Td>
        <Table.Td>{train.trainNumber}</Table.Td>
        <Table.Td>{train.destination}</Table.Td>
        <Table.Td>{train.departureTime}</Table.Td>
        <Table.Td>{train.delay !== "Nessuno" && train.delay}</Table.Td>
        <Table.Td>{train.platform}</Table.Td>
        <Table.Td>{train.departing && "IN PARTENZA"}</Table.Td>
    </Table.Tr>));

    return (<Table striped highlightOnHover stickyHeader captionSide="bottom" ta="left">
        <Table.Caption fz="md">{monitor.alerts.trim()}</Table.Caption>
        {monitor.trains.length > 0 ? (
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>Compagnia</Table.Th>
                    <Table.Th>Tipo</Table.Th>
                    <Table.Th>Numero</Table.Th>
                    <Table.Th>Destinazione</Table.Th>
                    <Table.Th>Orario</Table.Th>
                    <Table.Th>Ritardo</Table.Th>
                    <Table.Th>Binario</Table.Th>
                    <Table.Th></Table.Th>
                </Table.Tr>
            </Table.Thead>
        ) : (
            <Table.Thead>
                <Table.Tr>
                    <Table.Th c="dimmed" fz="xl" ta="center" py="xl">Nessun treno in partenza.
                    </Table.Th>
                </Table.Tr>
            </Table.Thead>
        )}
        <Table.Tbody>{rows}</Table.Tbody>
    </Table>);
}