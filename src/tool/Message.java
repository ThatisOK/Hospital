package tool;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import javax.servlet.http.HttpServletResponse;

import org.json.JSONObject;

import net.sf.json.JSONArray;
import medicine.Medicine;

public class Message {
	
	
	public void sendJson(HttpServletResponse response, int errno, String errMsg){
		response.setContentType("application/json;charset=UTF-8");
		PrintWriter out = null;
		try {
			out = response.getWriter();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		JSONObject json = new JSONObject();
		json.put("errno", errno);
		json.put("errMsg", errMsg);
		out.write(json.toString());
		
	}
	
	public String arraylistToJson(ArrayList list){
		if(list.isEmpty())
			return null;
		JSONArray json = JSONArray.fromObject(list);
		return json.toString();
	}

}
