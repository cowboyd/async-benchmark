export class InvalidOutputError extends Error {
    public name = "InvalidOutputError";
    constructor(public error: any) {
        super("Received invalid output");
    }
}

export class TimeoutError extends Error {
    public name = "TimeoutError";
}
