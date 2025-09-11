"use client";

import {getDirections} from "@/api/motis/directions";
import {type Directions} from "@/api/motis/types";
import {type Location} from "@/types";
import {Button, Card, CardBody, CardHeader, DateInput, Link, TimeInput} from "@heroui/react";
import {CalendarDate, Time} from "@internationalized/date";
import {IconMap, IconSearch, IconWalk} from "@tabler/icons-react";
import {Favorites} from "./favorites";
import DeparturesCard from "@/app/departures-card";
import RequestLocation from "@/app/location";
import {LocationAutocomplete} from "./directions/autocomplete";
import Results from "./directions/results";
import {formatDuration} from "@/utils";
import {format} from "date-fns";
import {AnimatePresence, motion} from "motion/react";
import {useRef, useState} from "react";

interface SelectedLocations {
    from: Location | null;
    to: Location | null;
}

interface PageProps {
    favorites: any[];
    userLat: string;
    userLon: string;
    rfiId: string;
    vtId: string;
    departures: any;
    alerts: any[];
    notices: any[];
}

export default function Home({favorites, userLat, userLon, rfiId, vtId, departures, alerts, notices}: PageProps) {
    const [showResults, setShowResults] = useState(false);
    const [selectedLocations, setSelectedLocations] = useState<SelectedLocations>({
        from: null,
        to: null
    });
    const [date, setDate] = useState<CalendarDate>(new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()));
    const [time, setTime] = useState<Time>(new Time(new Date().getHours(), new Date().getMinutes()));
    const [directions, setDirections] = useState<Directions>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const toInputRef = useRef<HTMLInputElement>(null);

    const fadeVariants = {
        hidden: {opacity: 0, y: 10},
        visible: {opacity: 1, y: 0},
        exit: {opacity: 0, y: -10},
    };

    const handleLocationSelect = (type: 'from' | 'to', location: Location | null) => {
        setSelectedLocations(prev => ({
            ...prev,
            [type]: location
        }));
    };

    const handleSearch = async () => {
        if (!selectedLocations.from || !selectedLocations.to || !date || !time) return;

        setIsLoading(true);
        setError(null);
        setDirections(undefined);

        try {
            const combinedDateTime = new Date(
                date.year,
                date.month - 1,
                date.day,
                time.hour,
                time.minute
            );

            const localIsoString = combinedDateTime.toISOString();

            const result = await getDirections(
                {
                    lat: selectedLocations.from.coordinates.lat,
                    lon: selectedLocations.from.coordinates.lon,
                    text: selectedLocations.from.label.toString()
                },
                {
                    lat: selectedLocations.to.coordinates.lat,
                    lon: selectedLocations.to.coordinates.lon,
                    text: selectedLocations.to.label.toString()
                },
                localIsoString
            );

            if (!result) {
                setError("errore nel recupero dei dati. riprova più tardi!");
            } else if (result.trips.length === 0 && result.direct.length === 0) {
                setError("nessun itinerario trovato per la ricerca effettuata!");
            } else {
                setDirections(result);
                setShowResults(true);
            }
        } catch (e) {
            console.error(e);
            setError("errore durante la comunicazione con il servizio. riprova più tardi!");
        } finally {
            setIsLoading(false);
        }
    };

    const isSameLocation = selectedLocations.from?.coordinates.lat === selectedLocations.to?.coordinates.lat &&
        selectedLocations.from?.coordinates.lon === selectedLocations.to?.coordinates.lon;

    return (
        <div className="flex flex-col items-center justify-center gap-4 text-center max-w-4xl w-full mx-auto">
            <h1 className="text-4xl font-bold">hey</h1>
            <h1 className="text-2xl max-w-4xl">pianifica i tuoi spostamenti senza problemi ✨</h1>

            <Card className="p-4 w-full">
                <CardBody className="gap-4">
                    <div className="flex flex-col md:flex-row justify-center items-center gap-4">
                        <LocationAutocomplete
                            name="from"
                            label="partenza"
                            nextInputRef={toInputRef}
                            onLocationSelect={(location) => handleLocationSelect('from', location)}
                        />
                        <LocationAutocomplete
                            name="to"
                            label="arrivo"
                            ref={toInputRef}
                            onLocationSelect={(location) => handleLocationSelect('to', location)}
                        />
                        <div className="flex flex-row justify-center items-center gap-4 max-w-md w-full">
                            <DateInput
                                variant="underlined"
                                label="data"
                                classNames={{label: "text-sm"}}
                                size="lg"
                                isInvalid={new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()) > date}
                                defaultValue={new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())}
                                onChange={(date) => setDate(date instanceof CalendarDate ? date : new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()))}
                            />
                            <TimeInput
                                variant="underlined"
                                label="ora"
                                classNames={{label: "text-sm"}}
                                size="lg"
                                hourCycle={24}
                                defaultValue={new Time(new Date().getHours(), new Date().getMinutes())}
                                onChange={(time) => setTime(time instanceof Time ? time : new Time(new Date().getHours(), new Date().getMinutes()))}
                            />
                        </div>
                    </div>

                    <Button
                        onPress={handleSearch}
                        variant="ghost"
                        color="primary"
                        className="self-center font-bold max-w-md md:max-w-32 w-full"
                        startContent={!isLoading && <IconSearch stroke={1.5} />}
                        isDisabled={!selectedLocations.from || !selectedLocations.to || !date || !time || isLoading || (selectedLocations && isSameLocation) || new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()) > date}
                        isLoading={isLoading}
                    >
                        {!isLoading && "cerca!"}
                    </Button>

                    {error && (
                        <div className="text-center">
                            <h2 className="text-lg font-bold text-red-500">
                                {error.includes("nessun") ? "nessun itinerario trovato" : "errore"}
                            </h2>
                            <p className="text-red-400">{error}</p>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Wrap the conditional content with AnimatePresence */}
            <AnimatePresence mode="wait">
                {showResults && directions ? (
                    // Use motion.div for the content you want to animate
                    <motion.div
                        key="results"
                        className="flex flex-col gap-4 w-full text-left"
                        variants={fadeVariants}
                        initial={false}
                        animate="visible"
                        exit="exit"
                        transition={{duration: 0.3}}
                    >
                        {directions.direct.length > 0 && (
                            <Card className="p-4">
                                <div className="flex flex-row justify-between">
                                    <div className="flex flex-row gap-2 items-center">
                                        <IconWalk size={24} />
                                        <div className="flex flex-col justify-center">
                                            <span className="sm:text-lg text-md font-bold">
                                                circa {formatDuration(Math.abs(directions.direct[0].legs[0].duration / 60), true)} a piedi
                                            </span>
                                            <span className="font-bold text-foreground-500">
                                                arrivo stimato alle {format(directions.direct[0].legs[0].endTime, "HH:mm")}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        as={Link}
                                        href={`https://maps.apple.com/?saddr=${directions.direct[0].legs[0].from.lat},${directions.direct[0].legs[0].from.lon}&daddr=${directions.direct[0].legs[0].to.lat},${directions.direct[0].legs[0].to.lon}&dirflg=w`}
                                        variant="bordered"
                                        isIconOnly
                                        isExternal
                                        startContent={<IconMap />}
                                        radius="full"
                                        className="border-gray-500 border-1 self-center"
                                        aria-label="percorso a piedi"
                                    />
                                </div>
                            </Card>
                        )}

                        <Results directions={directions} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="homepage"
                        className="flex flex-col gap-4 w-full"
                        variants={fadeVariants}
                        initial={false}
                        transition={{duration: 0.3}}
                    >
                        {alerts.length > 0 &&
                            <Card
                                className="flex flex-col p-2 gap-2 w-full mx-auto rounded-large shadow-medium text-left">
                                <CardHeader className="text-xl font-bold pb-0">⚠️ avvisi sulla rete
                                    ferroviaria</CardHeader>
                                <CardBody className="gap-2">
                                    {alerts && alerts.map((alert, index) => (
                                        <div key={index} className="flex flex-col">
                                            <Link href={alert.link} isExternal>{alert.title}</Link>
                                        </div>
                                    ))}
                                </CardBody>
                            </Card>}

                        <Favorites favorites={favorites} />

                        {userLat === "" || userLon === "" || rfiId === "" || vtId === "" ? (
                            <RequestLocation />
                        ) : (
                            <DeparturesCard departures={departures} />
                        )}

                        {notices.length > 0 &&
                            <Card
                                className="flex flex-col p-2 gap-2 w-full mx-auto rounded-large shadow-medium text-left">
                                <CardHeader className="text-xl font-bold pb-0">ℹ️ informazioni utili</CardHeader>
                                <CardBody className="gap-2">
                                    {notices && notices.map((alert, index) => (
                                        <div key={index}
                                             className={`flex flex-col ${alert.title.toLowerCase().includes("sciopero") ? "font-bold" : ""}`}>
                                            <Link href={alert.link} isExternal>{alert.title}</Link>
                                        </div>
                                    ))}
                                </CardBody>
                            </Card>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}