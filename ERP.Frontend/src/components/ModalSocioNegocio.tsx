import {
  Dialog,
  DialogContent,
  Grid,
  TextField,
  Button,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";

import { useEffect, useState } from "react";

import PersonIcon from "@mui/icons-material/Person";

import BusinessIcon from "@mui/icons-material/Business";

import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";

import {
  SocioNegocio,
  SocioNegocioForm
} from "../types/socioNegocio";

interface Props {

  open:boolean;

  onClose:()=>void;

  socio?:SocioNegocio|null;

  tipoSocio:"C"|"P";

  socios:SocioNegocio[];

  onSaved:(socio:SocioNegocioForm)=>Promise<void>;

}

export default function ModalSocioNegocio({

open,

onClose,

socio,

tipoSocio,

onSaved,

}:Props){

const [form,setForm]=

useState<SocioNegocioForm>({

id:0,

tipoSocio,

tipoDocumento:

tipoSocio==="C"
?
"DNI"
:
"RUC",

numeroDocumento:"",

nombres:"",

direccion:"",

telefono:"",

email:"",

limiteCredito:0,

saldo:0,

activo:true,

fechaRegistro:

new Date()

.toISOString()

});



useEffect(()=>{

if(socio){

setForm({

...socio

});

}

else{

setForm({

id:0,
tipoSocio,
tipoDocumento:
tipoSocio==="C"
?
"DNI"
:
"RUC",
numeroDocumento:"",
nombres:"",
direccion:"",
telefono:"",
email:"",
limiteCredito:0,
saldo:0,
activo:true,
fechaRegistro:
new Date()
.toISOString()
});
}
},[socio,open,tipoSocio]);

const handleChange=(
campo:string,
valor:any
)=>{
setForm({
...form,
[campo]:valor
});
};

const guardar=async()=>{
await onSaved(form);
onClose();
};



const inputStyle={
"& .MuiOutlinedInput-root":{
background:"#fff",
borderRadius:"14px",
fontSize:"15px",
fontWeight:600,
boxShadow:
"0 2px 8px rgba(0,0,0,.04)",
transition:"all .2s",
"& fieldset":{borderColor:"#d9e1ea"},
"&:hover fieldset":{borderColor:"#9fb4c7"},
"&.Mui-focused":{boxShadow:"0 0 0 4px rgba(46,139,114,.12)"},
"&.Mui-focused fieldset":{borderColor:"#2f9d72",borderWidth:"2px"}
}
};

return(

<Dialog
open={open}
onClose={onClose}
maxWidth="md"
fullWidth
  slotProps={{
    paper: {
      sx: {
        borderRadius: "18px",
        overflow: "hidden"
      }
    }
  }}
>
<DialogContent
sx={{padding:"28px"}}
>
{/* CABECERA */}
{/*<div
style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:"25px"
}}
>
<div>
<Typography
  fontWeight={700}
  fontSize={30}
  >
  {form.id?"Editar ":"Nuevo "}
  {tipoSocio==="C"?"Cliente":"Proveedor"}
</Typography>
<Typography
  color="#7c8798"
  >
  Información general
</Typography>
</div>
<IconButton
onClick={onClose}
>
<CloseIcon/>
</IconButton>
</div>
*/}

{/* CABECERA */}
<div
style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:"25px"
}}
>
<div
style={{
display:"flex",
alignItems:"center",
gap:"18px"
}}
>
<div
style={{
width:"72px",
height:"72px",
borderRadius:"50%",
background:
"linear-gradient(135deg,#2f9d72,#237d67)",
display:"flex",
justifyContent:"center",
alignItems:"center",
boxShadow:
"0 10px 30px rgba(47,157,114,.3)"
}}
>
<Typography
sx={{fontSize:"34px",color:"#fff"}}
>

{/*{tipoSocio==="C"?"👤":"🏢"} ANTERIOR */}
{
tipoSocio==="C"?
<PersonIcon 
sx={{fontSize:36,color:"#fff"}}
/>
:
<BusinessIcon
sx={{fontSize:36,color:"#fff"}}
/>
}
</Typography>
</div>
<div>

<Typography
sx={{fontSize:"30px",fontWeight:700,color:"#1e293b"}}
>
{form.id?"Editar ":"Nuevo "}
{tipoSocio==="C"?"Cliente":"Proveedor"}
</Typography>
<Typography
sx={{color:"#64748b",fontSize:"15px"}}
>
Complete la información general
</Typography>

</div>
</div>
<IconButton
onClick={onClose}
sx={{background:"#f3f4f6","&:hover":{background:"#e5e7eb"}}}
>
<CloseIcon/>
</IconButton>
</div>
<hr
style={{border:"none",borderTop:"1px solid #edf2f7",marginBottom:"30px"}}
/>

{/* NUEVO */}
<Typography
sx={{fontWeight:700,fontSize:"18px",mb:3,color:"#334155"}}
>
Información General
</Typography>


<Grid container spacing={3}>

<Grid size={12}>
<TextField
label={tipoSocio==="C"?"DNI":"RUC"}
fullWidth
value={form.numeroDocumento}
onChange={(e)=>handleChange("numeroDocumento",e.target.value)}
sx={inputStyle}
/>

</Grid>

<Grid size={12}>

<TextField
label={tipoSocio==="C"?"Nombres":"Razón Social"}
fullWidth
value={form.nombres}
onChange={(e)=>handleChange("nombres",e.target.value)}
sx={inputStyle}
/>
</Grid>

<Grid size={12}>

<TextField
label="Dirección"
fullWidth
value={form.direccion}
onChange={(e)=>handleChange("direccion",e.target.value)}
sx={inputStyle}
/>

</Grid>

<Grid size={{ xs: 12, md: 6 }}>
<TextField

label="Teléfono"
fullWidth
value={form.telefono}
onChange={(e)=>handleChange("telefono",e.target.value)}
sx={inputStyle}
/>
</Grid>

<Grid size={{ xs: 12, md: 6 }}>
<TextField
label="Email"
fullWidth
value={form.email}
onChange={(e)=>handleChange("email",e.target.value)}
sx={inputStyle}
/>
</Grid>

<Grid size={{ xs: 12, md: 4 }}>

<TextField
label="Límite Crédito"
type="number"
fullWidth
value={form.limiteCredito}
onChange={(e)=>handleChange("limiteCredito",Number(e.target.value))}
sx={inputStyle}
/>

</Grid>

<Grid size={{ xs: 12, md: 4 }}>
<TextField
label="Saldo"
type="number"
fullWidth
value={form.saldo}
onChange={(e)=>handleChange("saldo",Number(e.target.value))}
sx={inputStyle}
/>

</Grid>

<Grid size={{ xs: 12, md: 4 }}>
<FormControl
fullWidth
sx={inputStyle}
>

<InputLabel>
Estado
</InputLabel>
<Select value={form.activo?"Activo":"Inactivo"}
label="Estado"
onChange={(e)=>handleChange("activo",e.target.value==="Activo")}
>
<MenuItem
value="Activo"
>
Activo
</MenuItem>
<MenuItem
value="Inactivo"
>
Inactivo
</MenuItem>
</Select>
</FormControl>
</Grid>

<Grid size={12}>
<Button
fullWidth
variant="contained"
onClick={guardar}
sx={{
mt:2,
height:"58px",
borderRadius:"14px",
fontSize:"18px",
fontWeight:700,
textTransform:"none",
background:
"linear-gradient(90deg,#2f9d72,#237d67)",
boxShadow:
"0 12px 30px rgba(47,157,114,.30)",
"&:hover":{background:"linear-gradient(90deg,#278864,#1d6c58)"}
}}
>
{
form.id?"Actualizar ":"Guardar "}
{
tipoSocio==="C"?
"Cliente":"Proveedor"
}
</Button>


</Grid>
</Grid>
</DialogContent>
</Dialog>
);
}