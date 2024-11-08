export const getDelayColor = (delay: number | null) => {
    if (delay === null) return 'gray';
    if (delay >= 10) return 'red';
    if (delay >= 5) return 'yellow';
    if (delay >= 0) return 'green';
    return 'grape';
};

export const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('it-IT', {
        hour: '2-digit', minute: '2-digit',
    });
};