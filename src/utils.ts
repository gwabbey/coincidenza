export const getDelayColor = (delay: number | null) => {
    if (delay === null) return 'default';
    if (delay >= 10) return 'danger';
    if (delay >= 5) return 'warning';
    if (delay >= 0) return 'success';
    return 'secondary';
};

export const formatDuration = (duration: number) => {
    const durationInMinutes = Math.round(duration / 60);
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes !== 0 ? minutes + "min" : ""}` : `${minutes}min`;
};