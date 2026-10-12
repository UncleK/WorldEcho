const priorities={core:0,reference:1,provisional:2,related:3,other:4,pending:5};
export const modelPriority=entry=>priorities[entry.modelCollection??entry.collection??'core']??5;
