import {Flex, Title} from "@mantine/core";
import {TrainStationInput} from "./TrainStationInput";

export default function Page() {
    return (
        <Flex
            justify="center"
            direction="column"
            wrap="wrap"
            ta="center"
            gap="md"
        >
            <Title order={1} maw={750} w="100%" mx="auto">
                Cerca stazione dei treni
            </Title>
            <TrainStationInput placeholder="Cerca stazione" />
        </Flex>
    )
}