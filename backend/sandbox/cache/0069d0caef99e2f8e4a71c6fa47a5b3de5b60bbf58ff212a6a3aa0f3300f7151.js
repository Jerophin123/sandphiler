"use strict";
class ListNode {
    data;
    next;
    constructor(data, next = null) {
        this.data = data;
        this.next = next;
    }
}
class LinkedList {
    head = null;
    add(data) {
        const newNode = new ListNode(data);
        if (!this.head) {
            this.head = newNode;
        }
        else {
            let current = this.head;
            while (current.next) {
                current = current.next;
            }
            current.next = newNode;
        }
    }
    display() {
        let curr = this.head;
        const elements = [];
        while (curr) {
            elements.push(curr.data);
            curr = curr.next;
        }
        console.log(elements.join(" -> ") + " -> NULL");
    }
}
const list = new LinkedList();
list.add("Node.js");
list.add("TypeScript");
list.display();
