import {cache} from 'react';
import {loadLocalizedCustomPage} from './localized-page-runtime';
import {loadLocalizedShell} from './localized-shell';
/** Request-local memoization binds layout, metadata and body to the same verified snapshots. */
export const loadLocalizedVisitor=cache(async(path:string,locale:string)=>{
 const content=await loadLocalizedCustomPage(path,locale);
 if(!content)return null;
 const shell=await loadLocalizedShell(locale,{recordId:content.settingsRecordId,revisionId:content.settingsRevisionId});
 if(!shell)throw Error('Localized shell is unavailable.');
 return {...content,shell};
});
