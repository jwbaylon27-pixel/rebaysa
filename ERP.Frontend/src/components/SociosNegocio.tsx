import React, { useState } from "react";

import {
  Add,
  Edit,
  Delete
}
from "@mui/icons-material";
import {
  TablePagination
}
from "@mui/material";
import "./SociosNegocio.css";
import ModalSocioNegocio
from "./ModalSocioNegocio";
import type {
  SocioNegocio,
  SocioNegocioForm
}
from "../types/socioNegocio";



interface Props {
  cargando:boolean;
  guardando:boolean;
  socios:SocioNegocio[];
  tipoSocio:"C"|"P";
  onEliminar:(id:number)=>Promise<void>;
  onGuardar:(socio:SocioNegocioForm)=>Promise<void>;
}



export default function SociosNegocio({
  cargando,
  guardando,
  socios,
  tipoSocio,
  onEliminar,
  onGuardar
}:Props){

const [openModal,setOpenModal]=
useState(false);
const [socioEditar,setSocioEditar]=
useState<
SocioNegocio
|
undefined
>(undefined);
const [busqueda,setBusqueda]=
useState("");
const [page,setPage]=
useState(0);
const [rowsPerPage,setRowsPerPage]=useState(10);

const filtrados=socios
.filter(x=>x.tipoSocio===tipoSocio)
.filter(x=>x.nombres
.toLowerCase()
.includes(busqueda
.toLowerCase()
)
||
x.numeroDocumento
.toLowerCase()
.includes(busqueda
.toLowerCase()
)
);

const paginados=filtrados.slice(page*rowsPerPage,page*rowsPerPage+rowsPerPage);

return(
<div
className="socios-container"
>

{/* CABECERA */}
<div
className="socios-header"
>
<div>
<h2
className=
"socios-titulo"
>
{
tipoSocio==="C"?"Clientes":"Proveedores"
}
</h2>
<div
className=
"socios-subtitulo"
>
{
tipoSocio==="C"?
"Administración de clientes":"Administración de proveedores"
}
</div>
</div>
<div
className="socios-actions"
>
<input
className=
"socios-search"
placeholder={
`Buscar ${
tipoSocio==="C"?
"cliente":
"proveedor"
}...`
}
value={
busqueda
}
onChange={(e)=>setBusqueda(e.target.value)}

/>

<button
className=
"btn-nuevo"
onClick={()=>{setSocioEditar(undefined);
setOpenModal(true);}}
>

<Add
sx={{fontSize:20,mr:1}}
/>
{
tipoSocio==="C"?
"Nuevo Cliente"
:
"Nuevo Proveedor"
}
</button>
</div>
</div>


{/* TABLA */}

<div
className=
"table-container"
>
<table
className=
"socios-table"
>
<thead>
<tr>
{/*<th>ID</th>*/}
<th>NOMBRES</th>
{/*<th>TIPO DOC.</th>*/}
<th>NÚMERO</th>
{/*<th>DIRECCIÓN</th>*/}
<th>TELÉFONO</th>
{/*<th>EMAIL</th>*/}
<th>LÍMITE</th>
<th>SALDO</th>
<th>ESTADO</th>
{/*<th>FECHA</th>*/}
<th>ACCIONES</th>
</tr>
</thead>
<tbody>
{
cargando?
<tr>
<td
colSpan={12}
style={{
textAlign:
"center",
padding:
"40px"
}}
>
Cargando...
</td>
</tr>
:
paginados.map(s=>(<tr
key={s.id}
>
{/*<td>{s.id}</td>*/}
<td><strong>{s.nombres}</strong></td>
{/* <td>{s.tipoDocumento}</td>*/}
<td>{s.numeroDocumento}</td>
{/* <td>{s.direccion}</td> */}
<td>{s.telefono}</td>
{/*<td>{s.email}</td>*/}
<td>S/
{
Number(s.limiteCredito).toFixed(2)
}
</td>
<td>S/
{
Number(s.saldo).toFixed(2)
}
</td>
<td>
{s.activo?
<span
className="badge-estado badge-activo"
>
Activo
</span>
:
<span
className="badge-estado badge-inactivo"
>
Inactivo
</span>
}
</td>
{/* <td>{new Date(s.fechaRegistro).toLocaleDateString()}</td> */}
<td>
<button
className=
"btn-icon btn-edit"
onClick={()=>{setSocioEditar(s);setOpenModal(true);}}
>
<Edit
fontSize="small"
/>
</button>
<button
className="btn-icon btn-delete"
onClick={()=>onEliminar(s.id)}
>
<Delete
fontSize="small"
/>
</button>
</td>
</tr>
)
)
}


</tbody>
</table>
</div>
<div
className=
"pagination-container"
>

<TablePagination

component="div"
count={filtrados.length}
page={page}
onPageChange={(e,newPage)=>setPage(newPage)}
rowsPerPage={rowsPerPage}
onRowsPerPageChange={(e)=>{setRowsPerPage(parseInt(e.target.value,10));
setPage(0);
}}

rowsPerPageOptions={[5,10,20]}
/>
</div>

<ModalSocioNegocio

open={openModal}
onClose={()=>setOpenModal(false)}
socio={socioEditar}
tipoSocio={tipoSocio}
onSaved={onGuardar}
socios={socios}
/>
</div>
);
}