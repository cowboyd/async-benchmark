export class FooEvent extends Event {
    constructor() {
        super("foo");
    }
}

export type FooEventMap = {
    foo: FooEvent;
};
