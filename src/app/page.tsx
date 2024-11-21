import { Button, Stack } from "@mantine/core";
import { IconBus, IconRoute, IconTrain } from "@tabler/icons-react";
import Link from "next/link";

const links = [
    { href: "/directions", label: "Cerca itinerario", icon: IconRoute },
    { href: "/bus", label: "Cerca fermata autobus", icon: IconBus },
    { href: "/trains", label: "Cerca stazione ferroviaria", icon: IconTrain },
]

export default function Page() {
    return (
        <div>
            <Stack
                mt="xl"
                align="center"
                justify="start"
                gap="xl"
            >
                {links.map((link, index) => (
                    <Button variant="gradient"
                        key={index}
                        gradient={{ from: 'violet', to: 'indigo', deg: 90 }}
                        radius="xl" size="xl" maw={750} w="100%" leftSection={<link.icon />} justify="start"
                        component={Link}
                        href={link.href}
                    >
                        {link.label}
                    </Button>
                ))}
            </Stack>
        </div>
    )
}