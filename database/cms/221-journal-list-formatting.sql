begin;
-- Preserve aligned per-item list formatting while excluding private span fields.
create or replace function cms.journal_public_payload(p_payload jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb; item jsonb; projected jsonb; images jsonb:='[]'; blocks jsonb:='[]'; seo jsonb; cta jsonb; button jsonb; field text;
 table_row jsonb; table_cell jsonb; item_spans jsonb; list_spans jsonb; list_index integer;
 span jsonb; safe_span jsonb; spans jsonb; combined text;
 image_fields text[]:=array['assetId','alt','decorative','caption','credit'];
begin
 result:=cms.journal_public_scalars(p_payload,array['schemaVersion','slug','title','category','author','date','readTime','description','quote']);
 if result is null then return null; end if;
 foreach field in array array['image','heroImage'] loop
  if p_payload ? field then
   projected:=cms.journal_public_scalars(p_payload->field,image_fields);if projected is null then return null; end if;
   result:=result||jsonb_build_object(field,projected);
  end if;
 end loop;
 if jsonb_typeof(p_payload->'gallery') is distinct from 'array' or jsonb_typeof(p_payload->'body') is distinct from 'array' then return null; end if;
 if jsonb_array_length(p_payload->'gallery')>50 or jsonb_array_length(p_payload->'body')>200 then return null; end if;
 for item in select value from jsonb_array_elements(p_payload->'gallery') loop
  projected:=cms.journal_public_scalars(item,image_fields);if projected is null then return null; end if;images:=images||jsonb_build_array(projected);
 end loop;
 for item in select value from jsonb_array_elements(p_payload->'body') loop
  case item->>'kind'
   when 'paragraph' then
    projected:=cms.journal_public_scalars(item,array['id','kind','text']);
    if item ? 'spans' then
     if jsonb_typeof(item->'spans') is distinct from 'array' then return null; end if;
     if jsonb_array_length(item->'spans') not between 1 and 200 then return null; end if;
     spans:='[]';combined:='';
     for span in select value from jsonb_array_elements(item->'spans') loop
      safe_span:=cms.journal_public_scalars(span,array['text','href','bold','italic','script']);
      if safe_span is null or jsonb_typeof(span->'text') is distinct from 'string' then return null; end if;
      if (span ? 'href' and jsonb_typeof(span->'href')<>'string')
       or (span ? 'bold' and jsonb_typeof(span->'bold')<>'boolean')
       or (span ? 'italic' and jsonb_typeof(span->'italic')<>'boolean')
       or (span ? 'script' and span->>'script' not in ('normal','superscript','subscript')) then return null; end if;
      combined:=combined||(span->>'text');spans:=spans||jsonb_build_array(safe_span);
     end loop;
     if combined is distinct from item->>'text' or length(combined)>10000 then return null; end if;
     projected:=projected||jsonb_build_object('spans',spans);
    end if;
   when 'table' then
    projected:=cms.journal_public_scalars(item,array['id','kind','caption']);
    if projected is null or jsonb_typeof(item->'caption') is distinct from 'string' or length(btrim(item->>'caption')) not between 1 and 500 then return null; end if;
    if jsonb_typeof(item->'headers') is distinct from 'array' or jsonb_typeof(item->'rows') is distinct from 'array' then return null; end if;
    if jsonb_array_length(item->'headers') not between 1 and 8 or jsonb_array_length(item->'rows') not between 1 and 50 then return null; end if;
    for table_cell in select value from jsonb_array_elements(item->'headers') loop
     if jsonb_typeof(table_cell)<>'string' or length(btrim(table_cell#>>'{}')) not between 1 and 200 then return null; end if;
    end loop;
    for table_row in select value from jsonb_array_elements(item->'rows') loop
     if jsonb_typeof(table_row)<>'array' then return null; end if;
     if jsonb_array_length(table_row)<>jsonb_array_length(item->'headers') then return null; end if;
     for table_cell in select value from jsonb_array_elements(table_row) loop
      if jsonb_typeof(table_cell)<>'string' or length(table_cell#>>'{}')>5000 then return null; end if;
     end loop;
    end loop;
    projected:=projected||jsonb_build_object('headers',item->'headers','rows',item->'rows');
   when 'heading' then projected:=cms.journal_public_scalars(item,array['id','kind','text','level']);
   when 'quote' then projected:=cms.journal_public_scalars(item,array['id','kind','text','attribution']);
   when 'link' then projected:=cms.journal_public_scalars(item,array['id','kind','label','href']);
   when 'list' then
    projected:=cms.journal_public_scalars(item,array['id','kind','ordered']);
    if projected is null or jsonb_typeof(item->'items') is distinct from 'array' then return null; end if;
    if jsonb_array_length(item->'items')>50 or exists(select 1 from jsonb_array_elements(item->'items') where jsonb_typeof(value)<>'string') then return null; end if;
    projected:=projected||jsonb_build_object('items',item->'items');
    if item ? 'itemSpans' then
     if jsonb_typeof(item->'itemSpans') is distinct from 'array' then return null; end if;
     if jsonb_array_length(item->'itemSpans')<>jsonb_array_length(item->'items') then return null; end if;
     list_spans:='[]';
     for item_spans,list_index in select value,ordinality from jsonb_array_elements(item->'itemSpans') with ordinality loop
      if item_spans='null'::jsonb then list_spans:=list_spans||'[null]'::jsonb;continue;end if;
      if jsonb_typeof(item_spans) is distinct from 'array' then return null;end if;
      if jsonb_array_length(item_spans) not between 1 and 200 then return null;end if;
      spans:='[]';combined:='';
      for span in select value from jsonb_array_elements(item_spans) loop
       safe_span:=cms.journal_public_scalars(span,array['text','href','bold','italic','script']);
       if safe_span is null or jsonb_typeof(span->'text') is distinct from 'string' then return null;end if;
       if (span ? 'href' and jsonb_typeof(span->'href')<>'string') or (span ? 'bold' and jsonb_typeof(span->'bold')<>'boolean')
        or (span ? 'italic' and jsonb_typeof(span->'italic')<>'boolean') or (span ? 'script' and span->>'script' not in ('normal','superscript','subscript')) then return null;end if;
       combined:=combined||(span->>'text');spans:=spans||jsonb_build_array(safe_span);
      end loop;
      if combined is distinct from item->'items'->>(list_index-1) or length(combined)>2000 then return null;end if;
      list_spans:=list_spans||jsonb_build_array(spans);
     end loop;
     projected:=projected||jsonb_build_object('itemSpans',list_spans);
    end if;

   when 'image' then
    projected:=cms.journal_public_scalars(item,array['id','kind']);
    button:=cms.journal_public_scalars(item->'image',image_fields);if projected is null or button is null then return null; end if;
    projected:=projected||jsonb_build_object('image',button);
   else return null;
  end case;
  if projected is null then return null; end if;blocks:=blocks||jsonb_build_array(projected);
 end loop;
 seo:=cms.journal_public_scalars(p_payload->'seo',array['schemaVersion','title','description','canonical','indexing','following','socialTitle','socialDescription','breadcrumbLabel','sitemap']);
 if seo is null then return null; end if;
 if p_payload->'seo' ? 'socialImage' then
  projected:=cms.journal_public_scalars(p_payload->'seo'->'socialImage',image_fields);if projected is null then return null; end if;
  seo:=seo||jsonb_build_object('socialImage',projected);
 end if;
 cta:=cms.journal_public_scalars(p_payload->'cta',array['enabled','heading','copy']);
 button:=cms.journal_public_scalars(p_payload->'cta'->'button',array['label','href','newWindow']);
 if cta is null or button is null then return null; end if;
 return result||jsonb_build_object('body',blocks,'gallery',images,'seo',seo,'cta',cta||jsonb_build_object('button',button));
end $$;

commit;
