package user;

import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import tool.Md5;
import tool.Message;

/**
 * Servlet implementation class User
 */
@WebServlet("/UserServlet")
public class UserServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;

	/**
	 * @see HttpServlet#HttpServlet()
	 */
	public UserServlet() {
		super();
		// TODO Auto-generated constructor stub
	}

	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse
	 *      response)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		// TODO Auto-generated method stub
		// response.getWriter().append("Served at:
		// ").append(request.getContextPath());
		doPost(request, response);
	}

	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse
	 *      response) 用户名 明文 密码 md5密文 数据库中的用户名 明文 数据库中的密码 明文 成功 return success
	 *      失败 return failure
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		request.setCharacterEncoding("utf-8");
		response.setCharacterEncoding("utf-8");
		String operation = request.getParameter("operation");
		HttpSession session = request.getSession();
		Message msg = new Message();
		if (operation == null) {
			msg.sendJson(response, -1, "failure");
			return;
		}
		UserDao ud = new UserDao();
		switch (operation) {
			case "signIn": {
				String Username = request.getParameter("username");
				String Password = request.getParameter("password");
				Md5 md5 = new Md5();
				String passwordMd5 = md5.Encryption(ud.userLogin(Username.trim()));
				if (Password.equals(passwordMd5)) {
					session.setAttribute("userid", ud.getIdByUsername(Username));
					session.setAttribute("username", Username);
					if (Username.equals("admin")) {
						msg.sendJson(response, 0, "admin");
					} else {
						msg.sendJson(response, 1, "success");
					}
	
				} else {
					msg.sendJson(response, -1, "failure");
				}
				break;
			}
			case "signOut": {
				session.removeAttribute("user");
				msg.sendJson(response, 0, "SignOutSuccess");
				break;
			}
			case "signUp": {
				String Username = request.getParameter("username");
				String Password = request.getParameter("password");
				ud.userAdd(Username, Password);
				// session.setAttribute("user", Username);
				msg.sendJson(response, 0, "添加成功");
				break;
			}
			case "deleteUser": {
				String username = request.getParameter("username");
				ud.userDelete(username);
				msg.sendJson(response, 0, "删除成功");
				break;
			}
			case "update-password": {
				String old = request.getParameter("old");
				String newp = request.getParameter("newp");
				if (ud.updatePassword(37, old, newp) > 0) {
					msg.sendJson(response, 0, "修改成功");
				} else {
					msg.sendJson(response, -1, "修改失败");
				}
			}
		}

	}

}
