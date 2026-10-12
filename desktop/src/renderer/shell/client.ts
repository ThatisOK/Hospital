import type {Result,CommitResult,Choice} from '../../contracts';
export async function value<T>(operation:Promise<Result<T>|CommitResult<T>>):Promise<T>{const result=await operation;if(result.kind==='rejected')throw new Error(result.error);return result.value;}
export async function choice<T>(operation:Promise<Choice<T>>):Promise<T|null>{const result=await operation;if(result.kind==='rejected')throw new Error(result.error);return result.kind==='canceled'?null:result.value;}
export async function completed(operation:Promise<Choice<null>>):Promise<boolean>{const result=await operation;if(result.kind==='rejected')throw new Error(result.error);return result.kind==='ok';}
